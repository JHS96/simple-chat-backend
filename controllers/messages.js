const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { validationResult } = require('express-validator');

const User = require('../models/user');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const { genericError, catchBlockError } = require('../util/errorHandlers');
const { clearDir } = require('../util/clearDirectory');
const io = require('../socket');
const { getConversationSocketIdMap } = require('../util/socketHandlers');

const socketIdMap = getConversationSocketIdMap();

exports.sendMessage = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return genericError(errors.array()[0].msg, 422, next);
	}
	const userId = req.userId;
	const msgReceiverId = req.body.msgReceiverId;
	const senderConversationId = req.body.senderConversationId;
	const receiverConversationId = req.body.receiverConversationId;
	const msgBody = req.body.msgBody;
	try {
		// Find receiver's conversation copy.
		const receiverCon = await Conversation.findById(receiverConversationId);
		if (!receiverCon) {
			return genericError(
				'Message not delivered. The intended recipient of this message does not appear to have an established conversation with you. The recipient may have deleted his/her copy of the conversation, or he/she may have deleted his/her account entirely. The only way to re-establish contact with this user is for you to delete this conversation, and then send a new contact request.',
				404,
				next
			);
		}
		// If receiver's conversation copy does not have current user as contactId, disallow message sending.
		if (receiverCon.contactId !== userId) {
			return genericError(
				'You are not authorized to send messages to this conversation.',
				404,
				next
			);
		}
		// Get name of the message sender.
		const sender = await User.findById(req.userId);
		if (!sender) {
			return genericError('User not found', 404, next);
		}
		// Find user's copy of conversation.
		const senderCon = await Conversation.findById(
			senderConversationId
		).populate('thread');
		if (!senderCon) {
			return genericError(
				'Message not delivered. You do not appear to have an established conversation with the intended recipient of this message.',
				404,
				next
			);
		}
		// If user isn't owner of senderConversation, disallow sending of message.
		if (senderCon.conversationOwner.toString() !== userId) {
			return genericError(
				'You are not authorized to send this message.',
				403,
				next
			);
		}
		// If sender has blocked (or been blocked by) receiver, abort sending message.
		const blockedIdx = sender.blockedList.findIndex(
			item => item._id.toString() === msgReceiverId
		);
		if (blockedIdx >= 0) {
			return genericError(
				'Unable to send message while this user is in your Blocked list.',
				409,
				next
			);
		}
		const beenBlockedByIdx = sender.blockedBy.findIndex(
			item => item._id.toString() === msgReceiverId
		);
		if (beenBlockedByIdx >= 0) {
			return genericError(
				'Sorry, you may not send messages to this user.',
				403,
				next
			);
		}
		// Receiver isn't the owner of the receiver conversation, disallow sending of message.
		if (msgReceiverId !== receiverCon.conversationOwner.toString()) {
			return genericError('Unauthorized.', 403, next);
		}
		// Create message copy for receiver.
		const receiverMsgCopy = new Message({
			senderName: sender.name,
			senderId: userId,
			senderConversationId: senderConversationId,
			receiverConversationId: receiverConversationId,
			message: msgBody,
			belongsToConversationId: receiverConversationId,
			msgCopyOwner: msgReceiverId,
			isSender: false
		});
		const receiveResult = await receiverMsgCopy.save();
		// Add message to thread array of receiver's copy of the conversation.
		receiverCon.thread.push(receiveResult);
		await receiverCon.save();
		// Create message copy for sender
		const senderMsgCopy = new Message({
			senderName: sender.name || 'Me',
			senderId: userId,
			senderConversationId: senderConversationId,
			receiverConversationId: receiverConversationId,
			receiversMsgCopyId: receiveResult._id.toString(),
			msgCopyOwner: userId,
			message: msgBody,
			belongsToConversationId: senderConversationId
		});
		const sendResult = await senderMsgCopy.save();
		// Re-save message receiver's copy of message, this time referencing sender's (newly created) message copy.
		receiveResult.receiversMsgCopyId = receiveResult._id.toString();
		await receiveResult.save();
		// Add user's copy of message to thread array of user's(sender's) conversation copy.
		senderCon.thread.push(sendResult);

		// Emit message to client where this particular conversation is connected.
		const recipientSocketId = await socketIdMap.get(receiverConversationId);
		await io
			.getIO()
			.to(recipientSocketId)
			.emit('new-message', { message: receiverMsgCopy });

		const updatedCon = await senderCon.save();
		res.status(201).json({
			message: 'Message sent.',
			updatedConversation: updatedCon,
			senderMsgCopy: senderMsgCopy
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.toggleIsStarred = async (req, res, next) => {
	const userId = req.userId;
	const messageId = req.body.messageId;
	try {
		// Find message in database.
		const msg = await Message.findById(messageId);
		if (!msg) {
			return genericError('Message not found,', 404, next);
		}
		// If msgCopyOwner !== userId, disallow toggle.
		if (msg.msgCopyOwner !== userId) {
			return genericError('Unauthorized.', 403, next);
		}
		// If message isStarred then unstar it, and vice versa.
		msg.isStarred = msg.isStarred = false ? msg.isStarred : !msg.isStarred;
		await msg.save();
		res.status(200).json({
			message: msg.isStarred ? 'Message starred.' : 'Message unstarred'
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.getAllConversations = async (req, res, next) => {
	const userId = req.userId;
	try {
		// Find requesting user by id extracted from token in /middleware/is-auth.js
		const user = await User.findById(userId).populate('conversations');
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		res.status(200).json({ conversations: user.conversations });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.getConversation = async (req, res, next) => {
	const conversationId = req.params.conversationId;
	try {
		// Find conversation by id.
		const conversation = await Conversation.findById(conversationId).populate(
			'thread'
		);
		if (!conversation) {
			return genericError('Conversation not found.', 404, next);
		}
		// If the requesting user's userId doesn't match the conversationOwner throw error.
		if (req.userId !== conversation.conversationOwner.toString()) {
			return genericError(
				'You are not authorized to view this conversation.',
				401,
				next
			);
		}
		res
			.status(200)
			.json({ message: 'Conversation found.', conversation: conversation });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.deleteMessage = async (req, res, next) => {
	const userId = req.userId;
	const conversationId = req.body.conversationId;
	const messageId = req.body.messageId;
	try {
		// Find conversation.
		const conversation = await Conversation.findById(conversationId).populate(
			'thread'
		);
		if (!conversation) {
			return genericError('This conversation could not be found.', 404, next);
		}
		// If userId !== conversationOwner throw error. (Not authorized.)
		if (userId !== conversation.conversationOwner.toString()) {
			return genericError(
				'You are not authorized to delete this message.',
				403,
				next
			);
		}
		// Find message.
		const message = await Message.findById(messageId);
		if (!message) {
			return genericError('Message not found.', 404, next);
		}
		// If message isStarred, disallow deletion.
		if (message.isStarred) {
			return genericError('Unable to delete starred message.', 409, next);
		}
		// Delete message.
		await Message.deleteOne({ _id: new mongoose.Types.ObjectId(messageId) });
		// Remove reference to message from user's conversation copy thread.
		const updatedThread = conversation.thread.filter(
			msgId => msgId._id.toString() !== messageId
		);
		conversation.thread = updatedThread;
		await conversation.save();
		res
			.status(200)
			.json({ message: 'Message deleted.', updatedThread: updatedThread });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.deleteMessageForBoth = async (req, res, next) => {
	const userId = req.userId;
	const conversationId = req.body.conversationId;
	const messageId = req.body.messageId;
	try {
		// Find message.
		const userMsgCopy = await Message.findById(messageId);
		if (!userMsgCopy) {
			return genericError('Message not found.', 404, next);
		}
		// If userId !== senderId throw error. (Not authorized to delete for both.)
		if (userId !== userMsgCopy.senderId) {
			return genericError(
				'You may not delete this message for both yourself and the message sender.',
				403,
				next
			);
		}
		// If isSender flag is false, it means that this is NOT the user's copy of the message,
		// therefore disallow deletion.
		if (userMsgCopy.isSender === false) {
			return genericError('Unauthorized.', 403, next);
		}
		// If message was sent more that 1 hour ago, disallow delete for both.
		if (
			Date.now() >
			new Date(userMsgCopy.createdAt).getTime() + 1000 * 60 * 60
		) {
			return genericError(
				'Unable to delete for both. More that 1 hour has passed since the original message was sent.',
				410,
				next
			);
		}
		// Find user's conversation.
		const userCon = await Conversation.findById(conversationId).populate(
			'thread'
		);
		if (!userCon) {
			return genericError('Conversation not found.', 404, next);
		}
		// If userId !== conversationOwner throw error. (Not authorized.)
		if (userId !== userCon.conversationOwner.toString()) {
			return genericError(
				'You are not authorized to delete this message.',
				403,
				next
			);
		}
		// Remove reference to message from user's conversation copy's thread.
		const updatedUserConThread = userCon.thread.filter(
			msgId => msgId._id.toString() !== messageId
		);
		userCon.thread = updatedUserConThread;
		await userCon.save();
		// Find contact's copy of conversation.
		const contactConId = userCon.contactsConversationId;
		const contactCon = await Conversation.findById(contactConId);
		if (contactCon) {
			const contactMsgCopyId = userMsgCopy.receiversMsgCopyId;
			// Find contact's copy of message.
			const contactMsgCopy = await Message.findById(contactMsgCopyId);
			if (contactMsgCopy) {
				// Alter contact's copy of message.
				const alteredMessage = await Message.findByIdAndUpdate(
					contactMsgCopyId,
					{
						message: 'Message deleted by sender...',
						msgDeletedBySender: true
					}
				);
				// Emit to client where this particular conversation is connected.
				await io.getIO().emit('alter-message', { alteredMsg: alteredMessage });
			}
		}
		// Delete user's copy of message.
		await Message.deleteOne({ _id: new mongoose.Types.ObjectId(messageId) });
		res.status(200).json({
			message: 'Message deleted.',
			updatedThread: updatedUserConThread
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.clearMessages = async (req, res, next) => {
	const userId = req.userId;
	const conversationId = req.body.conversationId;
	try {
		// Find user's conversation copy.
		const userConCopy = await Conversation.findById(conversationId);
		if (!userConCopy) {
			return genericError('Conversation not found.', 404, next);
		}
		if (userId !== userConCopy.conversationOwner._id.toString()) {
			return genericError('Unauthorized.', 403, next);
		}
		if (userConCopy.thread.length === 0) {
			return genericError('There are no messages to clear.', 409, next);
		}
		// Remove all references to messages from user's conversation copy.
		userConCopy.thread = [];
		await userConCopy.save();
		// Delete all messages which belong to user's conversation copy.
		await Message.deleteMany({ belongsToConversationId: conversationId });
		res.status(200).json({ message: 'Messages cleared.' });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.deleteAllExceptStarred = async (req, res, next) => {
	const userId = req.userId;
	const conversationId = req.body.conversationId;
	try {
		// Find conversation and populate thread array.
		const conversation = await Conversation.findById(conversationId).populate(
			'thread'
		);
		if (!conversation) {
			return genericError('Conversation not found.', 404, next);
		}
		// If userId !== conversationOwner, disallow deletion.
		if (userId !== conversation.conversationOwner.toString()) {
			return genericError('Unauthorized.', 403, next);
		}
		// Remove references to all messages with isSterred: false.
		const updatedThread = conversation.thread.filter(msg => msg.isStarred);
		conversation.thread = updatedThread;
		await conversation.save();
		// Delete all messages belonging to this conversation, but only if isStarred: false.
		await Message.deleteMany({
			belongsToConversationId: conversationId,
			isStarred: false
		});
		res.status(200).json({
			message: 'All unstarred messages deleted.',
			updatedThread: updatedThread
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.deleteConversation = async (req, res, next) => {
	const userId = req.userId;
	const conversationId = req.body.conversationId;
	try {
		// Remove reference to conversation from user's conversations array.
		const user = await User.findById(userId).populate('conversations');
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		const updatedConArr = user.conversations.filter(
			con => con._id.toString() !== conversationId
		);
		user.conversations = updatedConArr;
		await user.save();
		// Find conversation.
		const conversation = await Conversation.findById(conversationId);
		if (!conversation) {
			return genericError('Conversation not found.', 404, next);
		}
		// If userId !== conversationOwner, disallow deletion.
		if (userId !== conversation.conversationOwner.toString()) {
			return genericError(
				'You are not authorized to delete this conversation!',
				403,
				next
			);
		}
		// Delete conversation.
		await Conversation.deleteOne({
			_id: new mongoose.Types.ObjectId(conversationId)
		});
		// Delete all messages that belong to conversation.
		await Message.deleteMany({ belongsToConversationId: conversationId });
		res.status(200).json({
			message: 'Conversation successfully deleted.',
			updatedConversations: updatedConArr
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.downloadConversation = async (req, res, next) => {
	// const userId = req.userId;
	const userId = req.userId;
	const conversationId = req.params.conversationId;
	try {
		// Find conversation.
		const conversation = await Conversation.findById(conversationId).populate(
			'thread'
		);
		if (!conversation) {
			return genericError('Conversation not found.', 404, next);
		}
		// If userId !== conversationOwner, disallow download.
		if (userId !== conversation.conversationOwner.toString()) {
			return genericError(
				'You are not authorized to download this conversation.',
				403,
				next
			);
		}
		// Create and send conversation as .pdf file.
		const filename = 'Conversation-' + conversationId + '.pdf';
		const filePath = path.join('data', 'pdfs', filename);
		const pdfDoc = new PDFDocument();
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="' + filename + '"'
		);
		pdfDoc.pipe(fs.createWriteStream(filePath));
		pdfDoc.pipe(res);
		pdfDoc.fontSize(22).text('Conversation with ' + conversation.contactName, {
			underline: true,
			align: 'center'
		});
		pdfDoc.moveDown();
		for (const msg of conversation.thread) {
			pdfDoc
				.fontSize(6)
				.fillColor('lightgrey')
				.text(new Date(msg.createdAt).toLocaleString());
			pdfDoc
				.fontSize(10)
				.fillColor('black')
				.text(msg.senderName + ':', { underline: true, continued: true })
				.stroke()
				.fontSize(12)
				.fillColor('grey')
				.text(' ' + msg.message, { underline: false });
			pdfDoc.moveDown();
		}
		pdfDoc.end();
		// Clear out data/pdfs folder. (File will NOT be stored on server.)
		clearDir('data/pdfs');
	} catch (err) {
		catchBlockError(err, next);
	}
};

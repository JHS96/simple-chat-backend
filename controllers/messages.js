const User = require('../models/user');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const { genericError, catchBlockError } = require('../util/errorHandlers');

exports.sendMessage = async (req, res, next) => {
	const senderConversationId = req.body.senderConversationId;
	const receiverConversationId = req.body.receiverConversationId;
	const msgBody = req.body.msgBody;
	try {
		// Get name of the message sender & Create message copy for receiver
		const sender = await User.findById(req.userId);
		if (!user) {
			return genericError('User not found', 404, next);
		}
		const receiverMsgCopy = new Message({
			senderName: sender.name,
			senderConversationId: senderConversationId,
			receiverConversationId: receiverConversationId,
			message: msgBody,
			isSender: false
		});
		const receiveResult = await receiverMsgCopy.save();
		// Find receiver's copy of conversation and add message to thread array
		const receiverCon = await Conversation.findById(receiverConversationId);
		if (!receiverCon) {
			return genericError(
				'Message not delivered. The intended recipient of this message does not appear to have an established conversation with you.',
				404,
				next
			);
		}
		receiverCon.thread.push(receiveResult);
		await receiverCon.save();
		// Create message copy for sender
		const senderMsgCopy = new Message({
			senderName: 'Me',
			senderConversationId: senderConversationId,
			receiverConversationId: receiverConversationId,
			receiversMsgCopyId: receiveResult._id.toString(),
			message: msgBody
		});
		const sendResult = await senderMsgCopy.save();
		// Find sender's copy of conversation and add message to thread array
		const senderCon = await Conversation.findById(senderConversationId);
		if (!senderCon) {
			return genericError(
				'Message not delivered. You do not appear to have an established conversation with the intended recipient of this message.',
				404,
				next
			);
		}
		senderCon.thread.push(sendResult);
		await senderCon.save();
		res.status(200).json({ message: 'Message sent.' });
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
		res.status(200).json({ data: user.conversations });
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
			.json({ message: 'Conversation found.', data: conversation });
	} catch (err) {
		catchBlockError(err, next);
	}
};

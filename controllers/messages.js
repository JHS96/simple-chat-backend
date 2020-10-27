const User = require('../models/user');
const Conversation = require('../models/conversation');
const Message = require('../models/message');

exports.sendMessage = async (req, res, next) => {
	const senderConversationId = req.body.senderConversationId;
	const receiverConversationId = req.body.receiverConversationId;
	const msgBody = req.body.msgBody;
	try {
		// Get name of the message sender & Create message copy for receiver
		const sender = await User.findById(req.body.userId); // TODO Change to req.userId when is-auth.js is implemented
		const receiverMsgCopy = new Message({
			senderName: sender.name,
			senderId: senderConversationId,
			receiverId: receiverConversationId,
			message: msgBody,
			isSender: false
		});
		const receiveResult = await receiverMsgCopy.save();
		// Find receiver's copy of conversation and add message to thread array
		const receiverCon = await Conversation.findById(receiverConversationId);
		if (!receiverCon) {
			const error = new Error(
				'Message not delivered. The intended recipient of this message does not appear to have an established conversation with you.'
			);
			error.statusCode = 404;
			return next(error);
		}
		receiverCon.thread.push(receiveResult);
		await receiverCon.save();
		// Create message copy for sender
		const senderMsgCopy = new Message({
			senderName: 'Me',
			senderId: senderConversationId,
			receiverId: receiverConversationId,
			receiversMsgCopyId: receiveResult._id.toString(),
			message: msgBody
		});
		const sendResult = await senderMsgCopy.save();
		// Find sender's copy of conversation and add message to thread array
		const senderCon = await Conversation.findById(senderConversationId);
		if (!senderCon) {
			const error = new Error(
				'Message not delivered. You do not appear to have an established conversation with the intended recipient of this message.'
			);
			error.statusCode = 404;
			return next(error);
		}
		senderCon.thread.push(sendResult);
		await senderCon.save();
		res.status(200).json({ message: 'Message sent.' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.getMessages = (req, res, next) => {
	const contactId = req.params.contactId;
	res
		.status(200)
		.json({ message: 'Here is the conversation between you and ' + contactId });
};

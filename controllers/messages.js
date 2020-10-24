const User = require('../models/user');
const Message = require('../models/message');

exports.sendMessage = async (req, res, next) => {
	const receiverId = req.body.receiverId;
	const senderId = req.body.msgSenderId;
	const conversationId = req.body.conversationId;
	const msgBody = req.body.msgBody;
	try {
		// Find receiver in database and add message to conversation with this sender
		const receiver = await User.findById(receiverId);
		if (!receiver) {
			const error = new Error(
				'The intented receiver for this message could not be found.'
			);
			error.statusCode = 404;
			return next(error);
		}
		const receiverThread = receiver.contacts.filter(
			c => c._id.toString() === conversationId
		);
		// console.log(receiver.contacts);
		// const newMsg = new Message({ msgSenderName: 'Jou Ma', message: 'Ligma Balls!' });
		// receiverThread.conversation.push(newMsg);
		// await receiver.save();

		// const con = receiver.populate('contacts[0].contactDetails');
		res.status(200).json({ data: receiver.contacts[0].conversation });
		// Find sender in database and add message to conversation with this receiver
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

const User = require('../models/user');
const Conversation = require('../models/conversation');

exports.requestContact = async (req, res, next) => {
	const requestSenderId = req.body.requestSenderId;
	const requestReceiverId = req.body.requestReceiverId;
	try {
		const reqSender = await User.findById(requestSenderId).populate(
			'conversations'
		);
		if (!reqSender) {
			const error = new Error('Could not find request sender.');
			error.statusCode = 404;
			return next(error);
		}
		// If request sender already has this person in their conversations array, throw error.
		const existingContact = reqSender.conversations.findIndex(
			conversation => conversation.contactId === requestReceiverId
		);
		if (existingContact >= 0) {
			const error = new Error('Contact already exists.');
			error.statusCode = 409;
			return next(error);
		}
		// If request has already been sent, don't send it again
		const alreadySent = reqSender.sentRequests.findIndex(
			c => c._id.toString() === requestReceiverId
		);
		if (alreadySent >= 0) {
			const error = new Error(
				'A contact request has already been sent to this user.'
			);
			error.statusCode = 409;
			return next(error);
		}
		// Add contact request sender to receiver's receivedRequests array
		const reqReceiver = await User.findById(requestReceiverId);
		if (!reqReceiver) {
			const error = new Error(
				'Could not user to whom this request should be sent.'
			);
			error.statusCode = 404;
			return next(error);
		}
		reqReceiver.receivedRequests.push(reqSender);
		await reqReceiver.save();
		// Add contact request receiver to sender's sentRequests array
		reqSender.sentRequests.push(reqReceiver);
		await reqSender.save();
		res.status(201).json({ message: 'Contact request sent.' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.addNewContact = async (req, res, next) => {
	const userId = req.body.userId;
	const requestSenderId = req.body.requestSenderId;
	try {
		// If user to which contact should be added could not be found, throw error.
		const user = await User.findById(userId).populate('conversations');
		if (!user) {
			const error = new Error('Uanable to find user to add this contact to.');
			error.statusCode = 404;
			return next(error);
		}
		// If request sender could not be found, throw error.
		const requestSender = await User.findById(requestSenderId).populate(
			'conversations'
		);
		if (!requestSender) {
			const error = new Error('New contact details could not be found.');
			error.statusCode = 404;
			return next(error);
		}
		// If request sender or receiver already has this contact in their conversations array, throw error.
		const senderHasContact = requestSender.conversations.findIndex(
			c => c.contactId === userId
		);
		const userHasContact = user.conversations.findIndex(
			c => c.contactId === requestSenderId
		);
		if (senderHasContact >= 0 || userHasContact >= 0) {
			const error = new Error('Contact already exists.');
			error.statusCode = 409;
			return next(error);
		}
		// Add request sender to user's conversations array and remove from user's receivedRequests array
		// also, create a Conversation Copy for user and add to user's conversations array
		const updatedReceivedRequests = user.receivedRequests.filter(
			r => r._id.toString() !== requestSenderId
		);
		user.receivedRequests = updatedReceivedRequests;
		const usersConversationCopy = new Conversation({
			conversationOwner: user,
			contactName: requestSender.name,
			contactId: requestSenderId,
			contactsConversationId: "<Reference to sender's copy of conversation>",
			thread: []
		});
		const userConCopy = await usersConversationCopy.save();
		user.conversations.push(userConCopy);
		await user.save();
		// Add user to the conversations array of the contact request sender and remove from sentRequests array
		// also, create a Conversation Copy for sender and add to sender's conversations array
		const updatedSentRequests = requestSender.sentRequests.filter(
			r => r._id.toString() !== userId
		);
		requestSender.sentRequests = updatedSentRequests;
		const sendersConversationCopy = new Conversation({
			conversationOwner: requestSender,
			contactName: user.name,
			contactId: userId,
			contactsConversationId: userConCopy._id.toString(),
			thread: []
		});
		const senConCopy = await sendersConversationCopy.save();
		requestSender.conversations.push(senConCopy);
		await requestSender.save();
		// Re-save user's conversation copy, this time referencing sender's (newly created) conversation copy
		userConCopy.contactsConversationId = senConCopy._id.toString();
		await userConCopy.save();
		res.status(201).json({ message: 'Contact added.' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

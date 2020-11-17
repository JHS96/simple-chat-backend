const User = require('../models/user');
const Conversation = require('../models/conversation');
const { genericError, catchBlockError } = require('../util/errorHandlers');

exports.searchUsers = async (req, res, next) => {
	const searchTerm = req.body.searchTerm;
	try {
		// Look for searchTerm matches using a regular expression
		const result = await User.find({ name: new RegExp(searchTerm, 'i') });
		if (!result) {
			// If no results are found, return empty array
			return res.status(404).json({ data: [] });
		}
		// Construct and return an array full of objects containig relevant info on search results
		const data = [];
		result.forEach(rslt => {
			if (rslt._id.toString() !== req.userId) {
				data.push({ name: rslt.name, id: rslt._id });
			}
		});
		res.status(200).json({ data: data });
	} catch (err) {
		catchBlockError(err, naxt);
	}
};

exports.requestContact = async (req, res, next) => {
	const requestSenderId = req.userId;
	const requestReceiverId = req.body.requestReceiverId;
	try {
		const reqSender = await User.findById(requestSenderId).populate(
			'conversations'
		);
		if (!reqSender) {
			return genericError('User not found.', 404, next);
		}
		// If reqSender has blocked (or been blocked by) reqReciver, disallow request.
		const blockedIdx = reqSender.blockedList.findIndex(
			item => item._id.toString() === requestReceiverId
		);
		if (blockedIdx >= 0) {
			return genericError(
				'Unable to send request while this user is in your Blocked list.',
				409,
				next
			);
		}
		const beenBlockedByIdx = reqSender.blockedBy.findIndex(
			item => item._id.toString() === requestReceiverId
		);
		if (beenBlockedByIdx >= 0) {
			return genericError(
				'Sorry, you may not send a contact request to this user.',
				403,
				next
			);
		}
		// If request sender already has this person in their conversations array, throw error.
		const existingContact = reqSender.conversations.findIndex(
			conversation => conversation.contactId === requestReceiverId
		);
		if (existingContact >= 0) {
			return genericError('Contact already exists.', 409, next);
		}
		// If request has already been sent, don't send it again
		const alreadySent = reqSender.sentRequests.findIndex(
			c => c._id.toString() === requestReceiverId
		);
		if (alreadySent >= 0) {
			return genericError(
				'A contact request has already been sent to this user.',
				409,
				next
			);
		}
		// Add contact request sender to receiver's receivedRequests array
		const reqReceiver = await User.findById(requestReceiverId);
		if (!reqReceiver) {
			return genericError(
				'Could not user to whom this request should be sent.',
				404,
				next
			);
		}
		reqReceiver.receivedRequests.push(reqSender);
		await reqReceiver.save();
		// Add contact request receiver to sender's sentRequests array
		reqSender.sentRequests.push(reqReceiver);
		await reqSender.save();
		res.status(201).json({ message: 'Contact request sent.' });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.deleteSentRequest = async (req, res, next) => {
	const userId = req.userId;
	const requestReceiverId = req.body.requestReceiverId;
	try {
		// Find user in database.
		const user = await User.findById(userId);
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		// Find sent request in user's sentRequests array and remove it.
		const updatedSentRequests = user.sentRequests.filter(
			r => r.toString() !== requestReceiverId
		);
		user.sentRequests = updatedSentRequests;
		await user.save();
		// Find request receiver in database.
		const requestReceiver = await User.findById(requestReceiverId);
		if (!requestReceiver) {
			return genericError(
				'The receiver of this request could not be found.',
				404,
				next
			);
		}
		// Find request in receiver's receivedRequests array and remove it.
		const updatedReceivedRequests = requestReceiver.receivedRequests.filter(
			r => r.toString() !== userId
		);
		requestReceiver.receivedRequests = updatedReceivedRequests;
		await requestReceiver.save();
		res.status(200).json({ message: 'Request deleted.' });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.deleteReceivedRequest = async (req, res, next) => {
	const userId = req.userId;
	const requestSenderId = req.body.requestSenderId;
	try {
		// Find user in database.
		const user = await User.findById(userId);
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		// Remove request from user's receivedRequests array.
		const updatedReceivedRequests = user.receivedRequests.filter(
			r => r.toString() !== requestSenderId
		);
		user.receivedRequests = updatedReceivedRequests;
		await user.save();
		res.status(200).json({ message: 'Request deleted.' });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.addNewContact = async (req, res, next) => {
	const userId = req.userId;
	const requestSenderId = req.body.requestSenderId;
	try {
		// If user to which contact should be added could not be found, throw error.
		const user = await User.findById(userId).populate('conversations');
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		// If request sender could not be found, throw error.
		const requestSender = await User.findById(requestSenderId).populate(
			'conversations'
		);
		if (!requestSender) {
			return genericError('New contact details could not be found.', 404, next);
		}
		// If request sender or receiver already has this contact in their conversations array, throw error.
		const senderHasContact = requestSender.conversations.findIndex(
			c => c.contactId === userId
		);
		const userHasContact = user.conversations.findIndex(
			c => c.contactId === requestSenderId
		);
		if (senderHasContact >= 0 || userHasContact >= 0) {
			return genericError('Contact already exists.', 409, next);
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
		catchBlockError(err, next);
	}
};

exports.getSentRequests = async (req, res, next) => {
	const userId = req.userId;
	try {
		// Find user and return info on items in sentRequests array.
		const user = await User.findById(userId).populate('sentRequests');
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		const data = [];
		user.sentRequests.forEach(sentReq => {
			data.push({
				id: sentReq._id.toString(),
				name: sentReq.name,
				email: sentReq.email
			});
		});
		res.status(200).json({ data: data });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.getReceivedRequests = async (req, res, next) => {
	const userId = req.userId;
	try {
		// Find user and return info on items in sentRequests array.
		const user = await User.findById(userId).populate('receivedRequests');
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		const data = [];
		user.receivedRequests.forEach(recReq => {
			data.push({
				id: recReq._id.toString(),
				name: recReq.name,
				email: recReq.email
			});
		});
		res.status(200).json({ data: data });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.addToBlockedList = async (req, res, next) => {
	const userId = req.userId;
	const userToBlockId = req.body.userToBlockId;
	try {
		// Find user in database.
		const user = await User.findById(userId);
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		// Find user to be blocked.
		const userToBlock = await User.findById(userToBlockId);
		if (!userToBlock) {
			genericError('User to be blocked could not be found.');
		}
		// If user to be blocked is already in blocked list don't add again.
		const userToBlockIndex = user.blockedList.findIndex(
			item => item._id.toString() === userToBlockId
		);
		if (userToBlockIndex >= 0) {
			return genericError('User already blocked.');
		}
		// Add userToBlock to blocked list.
		user.blockedList.push(userToBlock);
		// Remove userToBlock from user's sentRequests and/or receivedRequests arrays if present.
		const updatedSentReq = user.sentRequests.filter(
			r => r._id.toString() !== userToBlockId
		);
		const updatedReceivedReq = user.receivedRequests.filter(
			r => r._id.toString() !== userToBlockId
		);
		user.sentRequests = updatedSentReq;
		user.receivedRequests = updatedReceivedReq;
		await user.save();
		// Add user to the blockedBy list of the user that got blocked.
		userToBlock.blockedBy.push(user);
		await userToBlock.save();
		res
			.status(200)
			.json({ message: 'The user has been successfully blocked.' });
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.removeFromBlockedList = async (req, res, next) => {
	const userId = req.userId;
	const userToUnblockId = req.body.userToUnblockId;
	try {
		// Find user in database.
		const user = await User.findById(userId);
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		// Check if userToUnblock is in user's blodkedList.
		const userToUnBlockIdx = user.blockedList.findIndex(
			item => item._id.toString() === userToUnblockId
		);
		if (userToUnBlockIdx === -1) {
			return genericError('This user is not in your Blocked list.', 404, next);
		}
		// Remove userToUnblock from user's blockedList.
		const updatedBlockedList = user.blockedList.filter(
			item => item._id.toString() !== userToUnblockId
		);
		user.blockedList = updatedBlockedList;
		await user.save();
		// Find userToUnblock in database. If userToUnblock is not found because he/she maybe
		// deleted his/her account, no need to throw error. Just return "next()".
		const userToUnblock = await User.findById(userToUnblockId);
		if (!userToUnblock) return next();
		// Remove user from userToUnblock's blockedBy list.
		const updatedBlockedBy = userToUnblock.blockedBy.filter(
			item => item._id.toString() !== userId
		);
		userToUnblock.blockedBy = updatedBlockedBy;
		await userToUnblock.save();
		res.status(200).json({ message: 'Successfully unblocked.' });
	} catch (err) {
		catchBlockError(err, next);
	}
};

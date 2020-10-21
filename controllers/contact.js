const User = require('../models/user');

exports.requestContact = async (req, res, next) => {
	const requestSenderId = req.body.requestSenderId;
	const requestReceiverId = req.body.requestReceiverId;
	try {
		const reqSender = await User.findById(requestSenderId);
		if (!reqSender) {
			const error = new Error('Could not find request sender.');
			error.statusCode = 404;
			return next(error);
		}
		// If request sender already has this person in thier contacts array, throw error.
		const existingContact = reqSender.contacts.findIndex(
			c => c._id.toString() === requestReceiverId
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
		const user = await User.findById(userId);
		if (!user) {
			const error = new Error('Uanable to find user to add this contact to.');
			error.statusCode = 404;
			return next(error);
		}
		// If request sender could not be found, throw error.
		const requestSender = await User.findById(requestSenderId);
		if (!requestSender) {
			const error = new Error('New contact details could not be found.');
			error.statusCode = 404;
			return next(error);
		}
		// Add request sender to user's contacts array and remove from user's receivedRequests array
		user.contacts.push(requestSender);
		const updatedReceivedRequests = user.receivedRequests.filter(
			r => r._id.toString() !== requestSenderId
		);
		user.receivedRequests = updatedReceivedRequests;
		await user.save();
		// Add user to the contacts array of the contact request sender and remove from sentRequests array
		requestSender.contacts.push(user);
		const updatedSentRequests = requestSender.sentRequests.filter(
			r => r._id.toString() !== userId
		);
		requestSender.sentRequests = updatedSentRequests;
		await requestSender.save();
		res.status(201).json({ message: 'Contact added.' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

const User = require('../models/user');

exports.addNewContact = async (req, res, next) => {
	const userId = req.body.userId;
	const contactRequesterId = req.body.contactRequesterId;
	try {
		// If user to which contact should be added could not be found, throw error.
		const user = await User.findById(userId);
		if (!user) {
			const error = new Error('Uanable to find user to add this contact to.');
			error.statusCode = 404;
			return next(error);
		}
		// If contact requester could not be found, throw error.
		const newContact = await User.findById(contactRequesterId);
		if (!newContact) {
			const error = new Error('New contact details could not be found.');
			error.statusCode = 404;
			return next(error);
		}
		// Save contact requester to user's contacts array
		user.contacts.push(newContact);
		await user.save();
		// Also save user to the contacts array of the contact requester
		newContact.contacts.push(user);
		await newContact.save();
		res.status(201).json({ message: 'Contact added.' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

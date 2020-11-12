const { generate } = require('randomstring');

const User = require('../models/user');
const { sendConfirmationEMail } = require('../util/sendEmail');

exports.confirmEmailAddress = async (req, res, next) => {
	const activationToken = req.params.activationtoken;
	if (!activationToken) {
		const error = new Error('No activation token provided');
		error.statusCode = 422;
		return next(error);
	}
	// Find user with matching activation token.
	const userId = req.params.userId;
	try {
		const user = await User.findById(userId);
		if (!user) {
			const error = new Error('User account not found.');
			error.statusCode = 404;
			return next(error);
		}
		// Check if user's account has the submitted token as it's activationToken.
		if (user.activationToken !== activationToken) {
			const error = new Error('Token invalid!');
			error.statusCode = 406;
			return next(error);
		}
		// Check if token is still valid.
		if (user.activationTokenExpiration < Date.now()) {
			const error = new Error('Confirmation link expired!');
			error.statusCode = 410;
			return next(error);
		}
		// If user is found and token is valid, activate the user's account.
		user.isActive = true;
		user.activationToken = undefined;
		user.activationTokenExpiration = undefined;
		await user.save();
		res.status(200).json({
			message:
				'Thank you for confirming your email address. You may now log in to your account.'
		});
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.resendConfirmationEmail = async (req, res, next) => {
	const email = req.body.email;
	try {
		// Find user's inactive account.
		const user = await User.findOne({ email: email });
		if (!user) {
			const error = new Error('User not found.');
			error.statusCode = 404;
			return next(error);
		}
		if (user.isActive) {
			return res
				.status(409)
				.json({ message: 'This email address is already confirmed!' });
		}
		// Reset the user's activationToken and activationTokenExpiration.
		user.isActive = false;
		user.activationToken = generate(64);
		user.activationTokenExpiration = Date.now() + 1000 * 60 * 60;
		const result = await user.save();
		// Send new activation/confirmation email.
		sendConfirmationEMail(result);
		res.status(200).json({ message: 'Email sent. Please check your inbox' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

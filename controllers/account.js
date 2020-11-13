const { generate } = require('randomstring');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const {
	sendConfirmationEmail,
	sendPasswordResetLink
} = require('../util/sendEmail');

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
		sendConfirmationEmail(result);
		res.status(200).json({ message: 'Email sent. Please check your inbox' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.requestResetPassword = async (req, res, next) => {
	const email = req.body.email;
	try {
		// Find user with matching email address.
		const user = await User.findOne({ email: email });
		if (!user) {
			const error = new Error('User not found');
			error.statusCode = 404;
			return next(error);
		}
		// If user has requested too many password resets, lock the account.
		if (user.resetRequestCount && user.resetRequestCount >= 3) {
			const error = new Error(
				'You have already requested a password reset 3 times. For security reasons you will now need to contact Support for assistance to reset your password.'
			);
			error.statusCode = 429;
			return next(error);
		}
		// Generate reset token & expiration time and save to user's record in database.
		user.passwordResetToken = generate(64);
		user.passwordResetTokenExpiration = Date.now() + 1000 * 60 * 60;
		user.resetRequestCount = user.resetRequestCount
			? user.resetRequestCount + 1
			: 1;
		const result = await user.save();
		// Send email with reset link to user's email address.
		sendPasswordResetLink(result);
		res.status(200).json({
			message: `Password reset instructions sent to ${email}. Please check your inbox.`
		});
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.updatePassword = async (req, res, next) => {
	const userId = req.body.userId;
	const passwordResetToken = req.body.passwordResetToken;
	const newPassword = req.body.newPassword;
	try {
		// Find user in database.
		const user = await User.findById(userId);
		if (!user) {
			const error = new Error('User not found.');
			error.statusCode = 404;
			return next(error);
		}
		// Check that passwordResetToken is correct.
		if (user.passwordResetToken !== passwordResetToken) {
			const error = new Error('Password reset token invalid!');
			return next(error);
		}
		// Check that passwordResetToken is not expired.
		if (user.passwordResetTokenExpiration < Date.now()) {
			const error = new Error('Password reset token expired!');
			error.statusCode = 410;
			return next(error);
		}
		// Encrypt new password.
		const hashedPassword = await bcrypt.hash(newPassword, 12);
		// Save user back to database with new password.
		user.password = hashedPassword;
		user.passwordResetToken = undefined;
		user.passwordResetTokenExpiration = undefined;
		user.resetRequestCount = undefined;
		await user.save();
		res.status(200).json({
			message:
				'Password updated. You may now log in to your account with your new password.'
		});
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

const { generate } = require('randomstring');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const {
	sendConfirmationEmail,
	sendPasswordResetLink
} = require('../util/sendEmail');
const { genericError, catchBlockError } = require('../util/errorHandlers');

exports.confirmEmailAddress = async (req, res, next) => {
	const activationToken = req.params.activationtoken;
	if (!activationToken) {
		return genericError('No activation token provided', 422, next);
	}
	// Find user with matching activation token.
	const userId = req.params.userId;
	try {
		const user = await User.findById(userId);
		if (!user) {
			return genericError('User account not found.', 404, next);
		}
		// Check if user's account has the submitted token as it's activationToken.
		if (user.activationToken !== activationToken) {
			return genericError('Token invalid!', 406, next);
		}
		// Check if token is still valid.
		if (user.activationTokenExpiration < Date.now()) {
			return genericError('Confirmation link expired!', 410, next);
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
		catchBlockError(err, next);
	}
};

exports.resendConfirmationEmail = async (req, res, next) => {
	const email = req.body.email;
	try {
		// Find user's inactive account.
		const user = await User.findOne({ email: email });
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		if (user.isActive) {
			return genericError(
				'This email address is already confirmed!',
				409,
				next
			);
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
		catchBlockError(err, next);
	}
};

exports.requestResetPassword = async (req, res, next) => {
	const email = req.body.email;
	try {
		// Find user with matching email address.
		const user = await User.findOne({ email: email });
		if (!user) {
			return genericError('User not found', 404, next);
		}
		// If user has requested too many password resets, lock the account.
		if (user.resetRequestCount && user.resetRequestCount >= 3) {
			return genericError(
				'You have already requested a password reset 3 times. For security reasons you will now need to contact Support for assistance to reset your password.',
				429,
				next
			);
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
		catchBlockError(err, next);
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
			return genericError('User not found.', 404, next);
		}
		// Check that passwordResetToken is correct.
		if (user.passwordResetToken !== passwordResetToken) {
			return genericError('Password reset token invalid!', 406, next);
		}
		// Check that passwordResetToken is not expired.
		if (user.passwordResetTokenExpiration < Date.now()) {
			return genericError('Password reset token expired!', 410, next);
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
		catchBlockError(err, next);
	}
};
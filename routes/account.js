const express = require('express');
const { check } = require('express-validator');

const accountController = require('../controllers/account');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get(
	'/confirm-email/:userId/:activationtoken',
	accountController.confirmEmailAddress
);

router.post(
	'/resend-confirmation-email',
	check('email').trim().isEmail(),
	accountController.resendConfirmationEmail
);

router.post(
	'/request-reset-password',
	check('email', 'Please enter a valid email address.').trim().isEmail(),
	accountController.requestResetPassword
);

// Below route is for when the user has forgotten their password, and has requested
// password reset to be sent to them via email.
router.post(
	'/reset-password',
	check(
		'newPassword',
		'Password should be at least 6 characters and no more than 32 characters long.'
	)
		.trim()
		.isLength({ min: 6, max: 32 }),
	accountController.resetPassword
);

// Below route is for when the user has forgotten their password, and has requested
// password reset to be sent to them via email.
router.post(
	'/update-password',
	isAuth,
	check(
		'newPassword',
		'Password should be at least 6 characters and no more than 32 characters long.'
	)
		.trim()
		.isLength({ min: 6, max: 32 }),
	accountController.updatePassword
);

router.post(
	'/update-username',
	isAuth,
	check(
		'newUserName',
		'Username should be at least 3 character and no more than 15 characterslong.'
	)
		.trim()
		.isLength({ min: 3, max: 15 }),
	accountController.updateUserName
);

router.delete('/delete-account', isAuth, accountController.deleteAccount);

module.exports = router;

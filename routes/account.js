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

router.post(
	'/update-password',
	check(
		'newPassword',
		'Password should be at least 6 characters and no more than 32 characters long.'
	)
		.trim()
		.isLength({ min: 6, max: 32 }),
	accountController.updatePassword
);

router.delete('/delete-account', isAuth, accountController.deleteAccount);

module.exports = router;

const express = require('express');

const accountController = require('../controllers/account');

const router = express.Router();

router.get(
	'/confirm-email/:userId/:activationtoken',
	accountController.confirmEmailAddress
);

router.post(
	'/resend-confirmation-email',
	accountController.resendConfirmationEmail
);

router.post('/request-reset-password', accountController.requestResetPassword);

router.post('/update-password', accountController.updatePassword);

module.exports = router;

const express = require('express');

const accountController = require('../controllers/account');

const router = express.Router();

router.get(
	'/confirm/:userId/:activationtoken',
	accountController.confirmEmailAddress
);

router.post(
	'/resend-confirmation-email',
	accountController.resendConfirmationEmail
);

module.exports = router;

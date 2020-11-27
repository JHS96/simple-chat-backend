const express = require('express');
const { check } = require('express-validator');

const messagesController = require('../controllers/messages');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get(
	'/get-all-conversations',
	isAuth,
	messagesController.getAllConversations
);

router.get(
	'/get-conversation/:conversationId',
	isAuth,
	messagesController.getConversation
);

router.post(
	'/send-message',
	check('msgBody', 'Message needs to be at least 1 character long.')
		.trim()
		.isLength({ min: 1 }),
	isAuth,
	messagesController.sendMessage
);

router.post('/toggle-star', isAuth, messagesController.toggleIsStarred);

router.delete('/delete-message', isAuth, messagesController.deleteMessage);

router.delete(
	'/delete-message-for-both',
	isAuth,
	messagesController.deleteMessageForBoth
);

router.delete('/clear-messages', isAuth, messagesController.clearMessages);

router.delete(
	'/delete-all-except-starred',
	isAuth,
	messagesController.deleteAllExceptStarred
);

router.delete(
	'/delete-conversation',
	isAuth,
	messagesController.deleteConversation
);

router.get(
	'/download-conversation/:conversationId',
	isAuth,
	messagesController.downloadConversation
);

module.exports = router;

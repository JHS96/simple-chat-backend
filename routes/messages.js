const express = require('express');

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

router.post('/send-message', isAuth, messagesController.sendMessage);

router.delete('/delete-message', isAuth, messagesController.deleteMessage);

router.delete(
	'/delete-message-for-both',
	isAuth,
	messagesController.deleteMessageForBoth
);

module.exports = router;

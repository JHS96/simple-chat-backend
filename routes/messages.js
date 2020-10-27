const express = require('express');

const messagesController = require('../controllers/messages');

const router = express.Router();

router.get('/get-conversation/:conversationId', messagesController.getConversation);

router.post('/send-message', messagesController.sendMessage);

module.exports = router;

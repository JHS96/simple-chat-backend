const express = require('express');

const messagesController = require('../controllers/messages');

const router = express.Router();

router.get('/:contactId', messagesController.getMessages);

module.exports = router;

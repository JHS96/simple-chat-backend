const express = require('express');

const messagesController = require('../controllers/messages');

const router = express.Router();

router.get('/', messagesController.getMessages);

module.exports = router;

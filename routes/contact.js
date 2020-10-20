const express = require('express');

const router = express.Router();

const contactController = require('../controllers/contact');

router.post('/add-contact', contactController.addNewContact);

module.exports = router;

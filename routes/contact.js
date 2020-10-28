const express = require('express');

const contactController = require('../controllers/contact');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.post('/request-contact', isAuth, contactController.requestContact);

router.post('/add-contact', isAuth, contactController.addNewContact);

module.exports = router;

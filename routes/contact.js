const express = require('express');

const contactController = require('../controllers/contact');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.post('/search-users', isAuth, contactController.searchUsers);

router.get('/sent-requests', isAuth, contactController.getSentRequests);

router.delete(
	'/delete-sent-request',
	isAuth,
	contactController.deleteSentRequest
);

router.delete(
	'/delete-received-request',
	isAuth,
	contactController.deleteReceivedRequest
);

router.get('/received-requests', isAuth, contactController.getReceivedRequests);

router.post('/request-contact', isAuth, contactController.requestContact);

router.post('/add-contact', isAuth, contactController.addNewContact);

router.post('/add-to-blocked-list', isAuth, contactController.addToBlockedList);

router.post(
	'/remove-from-blocked-list',
	isAuth,
	contactController.removeFromBlockedList
);

module.exports = router;

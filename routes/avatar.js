const express = require('express');

const avatarController = require('../controllers/avatar');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.post('/delete-avatar-image', isAuth, avatarController.deleteAvatarImg);

module.exports = router;

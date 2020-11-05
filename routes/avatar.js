const express = require('express');
const multer = require('multer');

const avatarController = require('../controllers/avatar');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.delete('/delete-avatar-image', isAuth, avatarController.deleteAvatarImg);

router.route('/update-avatar-image').put(
	isAuth,
	multer({
		dest: 'temp/',
		limits: { fileSize: 4 * 1024 * 1024 },
		fileFilter: (req, file, cb) => {
			if (
				file.mimetype === 'image/jpg' ||
				file.mimetype === 'image/jpeg' ||
				file.mimetype === 'image/png'
			) {
				cb(null, true);
			} else {
				cb({ message: 'File type not allowed!' }, false);
			}
		}
	}).single('avatar'),
	avatarController.updateAvatarImg
);

module.exports = router;

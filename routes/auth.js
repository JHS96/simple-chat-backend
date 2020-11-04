const express = require('express');
const multer = require('multer');

const authController = require('../controllers/auth');

const router = express.Router();

router.route('/signup').post(
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
	authController.signup
);

router.post('/login', authController.login);

module.exports = router;

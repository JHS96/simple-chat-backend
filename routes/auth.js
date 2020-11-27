const express = require('express');
const multer = require('multer');
const { check } = require('express-validator');

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
	[
		check('name', 'Name should be between 3 and 15 characters long.')
			.trim()
			.isLength({
				min: 3,
				max: 15
			}),
		check('email', 'Please enter a valid email address.').trim().isEmail(),
		check(
			'password',
			'Password should be at least 6 characters and no more than 32 characters long.'
		)
			.trim()
			.isLength({ min: 6, max: 32 })
	],
	authController.signup
);

router.post(
	'/login',
	[
		check('email', 'Please enter a valid email address.').trim().isEmail(),
		check(
			'password',
			'Password should be at least 6 characters and no more than 32 characters long.'
		)
			.trim()
			.isLength({ min: 6, max: 32 })
	],
	authController.login
);

module.exports = router;

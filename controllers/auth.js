require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const fs = require('fs');
const { generate } = require('randomstring');
const { validationResult } = require('express-validator');

const User = require('../models/user');
const { clearDir } = require('../util/clearDirectory');
const { sendConfirmationEmail } = require('../util/sendEmail');
const { genericError, catchBlockError } = require('../util/errorHandlers');

exports.signup = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return genericError(errors.array()[0].msg, 422, next);
	}
	const name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;

	const saveUser = async user => {
		// Save user and send confirmation email.
		const result = await user.save();
		sendConfirmationEmail(result);
		res.status(201).json({
			message: `An email has been sent to: ${user.email}. Please check your inbox and click on the verification link in order to confirm your email address and activate your account. Please allow a few minutes for the email to arrive.`
		});
	};

	try {
		// If user with this email address already exists in database, abort new user creation.
		const existingUser = await User.findOne({ email: email });
		if (existingUser) {
			clearDir('temp'); // Ensures "/temp" directory is cleared of images submitted during failed signup.
			return genericError(
				'Email address already taken. Please use another email address.',
				422,
				next
			);
		}
		const hashedPassword = await bcrypt.hash(password, 12);

		// If the user chose an avatar image to upload, save it to aws-s3,
		// otherwise use the default avatar image referenced in the User model.
		if (req.file) {
			AWS.config.update({
				accessKeyId: process.env.AWS_IAM_USER_KEY,
				secretAccessKey: process.env.AWS_IAM_USER_SECRET,
				region: process.env.AWS_REGION
			});

			const s3 = new AWS.S3();
			const params = {
				ACL: 'public-read',
				Bucket: process.env.AWS_BUCKET_NAME,
				Body: fs.createReadStream(req.file.path),
				Key: `userAvatar/${new Date().toISOString()}-${req.file.originalname}`
			};

			s3.upload(params, async (err, data) => {
				if (err) {
					console.log('Error occured while trying to upload to S3 bucket', err);
				}
				if (data) {
					fs.unlinkSync(req.file.path); // Empty temp folder
					const avatarUrl = data.Location;
					const newUser = new User({
						name: name,
						email: email,
						password: hashedPassword,
						avatarUrl: avatarUrl,
						activationToken: generate(64),
						activationTokenExpiration: Date.now() + 1000 * 60 * 60
					});
					saveUser(newUser);
				}
			});
		} else {
			// New user created this way will have default avatar image - See User model
			const newUser = new User({
				name: name,
				email: email,
				password: hashedPassword,
				activationToken: generate(64),
				activationTokenExpiration: Date.now() + 1000 * 60 * 60
			});
			saveUser(newUser);
		}
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.login = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return genericError(errors.array()[0].msg, 422, next);
	}
	const email = req.body.email;
	const password = req.body.password;
	// If no user for this email could be found, throw error.
	try {
		const user = await User.findOne({ email: email });
		if (!user) {
			return genericError('No user for this email could be found.', 404, next);
		}
		// Check if password matches.
		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			return genericError('Password incorrect.', 401, next);
		}
		// If this account has not been activated yet, throw error.
		if (!user.isActive) {
			return genericError(
				'Your email address has not been confirmed yet.',
				403,
				next
			);
		}
		// Generate signed token.
		const token = jwt.sign(
			{ email: user.email, userId: user._id.toString() },
			process.env.JWT_SECRET,
			{ expiresIn: '12h' }
		);
		// If user exists and password is correct, send back userId and auth token
		res.status(200).json({
			data: {
				userId: user._id.toString(),
				userName: user.name,
				email: user.email,
				avatarUrl: user.avatarUrl
			},
			token: token,
			jwtExpireTime: Date.now() + 1000 * 60 * 12
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

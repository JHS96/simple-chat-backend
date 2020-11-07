require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const fs = require('fs');

const User = require('../models/user');
const { clearDir } = require('../util/clearDirectory');

exports.signup = async (req, res, next) => {
	const name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;

	const saveUser = async user => {
		const result = await user.save();
		// Generate signed token.
		const token = jwt.sign(
			{ email: result.email, userId: result._id.toString() },
			process.env.JWT_SECRET,
			{ expiresIn: '12h' }
		);
		// Send back userId and auth token.
		res.status(201).json({
			message: 'User created successfully.',
			userId: result._id,
			token: token
		});
	};

	try {
		// If user with this email address already exists in database, abort new user creation.
		const existingUser = await User.findOne({ email: email });
		if (existingUser) {
			clearDir('temp'); // Ensures "/temp" directory is cleared of images submitted during failed signup.
			const error = new Error(
				'Email address already taken. Please use another email address.'
			);
			error.statusCode = 422;
			return next(error);
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
						avatarUrl: avatarUrl
					});
					saveUser(newUser);
				}
			});
		} else {
			// New user created this way will have default avatar image - See User model
			const newUser = new User({
				name: name,
				email: email,
				password: hashedPassword
			});
			saveUser(newUser);
		}
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.login = async (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	// If no user for this email could be found, throw error.
	try {
		const user = await User.findOne({ email: email });
		if (!user) {
			const error = new Error('No user for this email could be found.');
			error.statusCode = 404;
			return next(error);
		}
		// Check if password matches.
		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			const error = new Error('Password incorrect.');
			error.statusCode = 401;
			return next(error);
		}
		// Generate signed token.
		const token = jwt.sign(
			{ email: user.email, userId: user._id.toString() },
			process.env.JWT_SECRET,
			{ expiresIn: '12h' }
		);
		// If user exists and password is correct, send back userId and auth token
		res.status(200).json({
			userId: user._id.toString(),
			token: token
		});
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

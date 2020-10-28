const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
	const name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;
	try {
		// If user with this email address already exists in database, abort new user creation.
		const existingUser = await User.findOne({ email: email });
		if (existingUser) {
			const error = new Error(
				'Email address already taken. Please use another email address.'
			);
			error.statusCode = 422;
			return next(error);
		}
		const hashedPassword = await bcrypt.hash(password, 12);
		const newUser = new User({
			name: name,
			email: email,
			password: hashedPassword
		});
		const result = await newUser.save();
		// Generate signed token.
		const token = jwt.sign(
			{ email: result.email, userId: result._id.toString() },
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		);
		// Send back userId and auth token.
		res.status(201).json({
			message: 'User created successfully.',
			userId: result._id,
			token: token
		});
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

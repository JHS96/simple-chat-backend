const bcrypt = require('bcryptjs');

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
				'Please use another email address.'
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
		res
			.status(201)
			.json({ message: 'User created successfully.', userId: result._id });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

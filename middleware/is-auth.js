const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
	// Check if Authorization Header is set.
	const authHeader = req.get('Authorization');
	if (!authHeader) {
		const error = new Error('Authorization header not set.');
		error.statusCode = 401;
		throw error;
	}
	// Get token from authHeader and decode it if possible.
	const token = authHeader.split(' ')[1];
	let decodedToken;
	try {
		decodedToken = jwt.verify(token, process.env.JWT_SECRET);
	} catch (err) {
		err.statusCode = 500;
		throw err;
	}
	if (!decodedToken) {
		const error = new Error('Not authenticated!');
		error.statusCode = 401;
		throw error;
  }
  // Dynamically add userId to req object
	req.userId = decodedToken.userId;
	next();
};

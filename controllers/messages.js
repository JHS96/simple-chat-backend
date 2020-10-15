exports.getMessages = (req, res, next) => {
	res.status(200).json({ message: 'You reached me bruh!' });
};

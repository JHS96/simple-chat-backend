exports.genericError = (msg, statusCode, next) => {
	const error = new Error(msg);
	error.statusCode = statusCode;
	return next(error);
};

exports.catchBlockError = (err, next) => {
	if (!err.statusCode) {
		err.statusCode = 500;
	}
	next(err);
};

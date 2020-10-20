exports.getMessages = (req, res, next) => {
	const contactId = req.params.contactId;
	res
		.status(200)
		.json({ message: 'Here is the conversation between you and ' + contactId });
};

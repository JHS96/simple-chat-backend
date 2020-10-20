const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const messageRoutes = require('./routes/messages');

require('dotenv').config();

const app = express();

app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/contact', contactRoutes);
app.use('/messages', messageRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
	console.log(error);
	const statusCode = error.statusCode || 500;
	const message = error.message;
	const data = error.data;
	res.status(statusCode).json({ message: message, data: data });
});

const PORT = process.env.PORT || 8080;
const DB_URI =
	process.env.NODE_ENV === 'production'
		? process.env.MONGODB_PROD
		: process.env.MONGODB_DEV;

mongoose
	.connect(DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	})
	.then(result => {
		app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
	})
	.catch(err => console.log(err));

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const messageRoutes = require('./routes/messages');
const avatarRoutes = require('./routes/avatar');
const accountRoutes = require('./routes/account');
const {
	addClientToMap,
	removeClientFromMap
} = require('./util/socketHandlers');

require('dotenv').config();

const app = express();

app.use(helmet());

app.use(bodyParser.json());

// CORS setup
app.use((req, res, next) => {
	// res.setHeader(
	// 	'Access-Control-Allow-Origin',
	// 	`${
	// 		process.env.NODE_ENV === 'production' ? process.env.FRONTEND_DOMAIN : '*'
	// 	}`
	// );
	res.setHeader('Access-Control-Allow-Origin', 'https://simplechat.online');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

app.use('/auth', authRoutes);
app.use('/contact', contactRoutes);
app.use('/messages', messageRoutes);
app.use('/avatar', avatarRoutes);
app.use('/account', accountRoutes);

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
		useUnifiedTopology: true,
		useFindAndModify: false
	})
	.then(result => {
		const server = app.listen(PORT, () =>
			console.log(`Server listening on port: ${PORT}`)
		);
		const io = require('./socket').init(server);
		let chatId;
		io.on('connection', socket => {
			// Add client to conversationSocketIdMap (in ./util/socketHandlers)
			if (socket.handshake.query.chatId) {
				chatId = socket.handshake.query.chatId;
				addClientToMap(chatId, socket.id);
			}
			socket.on('disconnect', () => {
				removeClientFromMap(chatId);
			});
		});
	})
	.catch(err => console.log(err));

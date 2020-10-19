const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');

require('dotenv').config();

const app = express();

app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);

const PORT = process.env.PORT || 8080;
const DB_URI = process.env.NODE_ENV === 'production' ? process.env.MONGODB_PROD : process.env.MONGODB_DEV;

mongoose
	.connect(DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	})
	.then(result => {
		app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
	})
	.catch(err => console.log(err));

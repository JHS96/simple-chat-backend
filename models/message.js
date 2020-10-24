const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema(
	{
		senderName: {
			type: String,
			required: true
		},
		senderId: {
			type: String,
			required: true
		},
		receiverId: {
			type: String,
			required: true
		},
		messgage: {
			type: String,
			required: true
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);

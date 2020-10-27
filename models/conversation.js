const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
	contactName: {
		type: String,
		required: true
	},
	contactId: {
		type: String,
		required: true
	},
	contactsConversationId: {
		type: String,
		required: true
	},
	thread: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Message',
			required: true
		}
	],
	contactIsOnline: {
		type: Boolean,
		default: false,
		required: true
	},
	contactHasSeenMessages: {
		type: Boolean,
		default: false,
		required: true
	}
});

module.exports = mongoose.model('Conversation', conversationSchema);

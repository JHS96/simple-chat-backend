const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema(
	{
		conversationOwner: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
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
		]
	},
	{ versionKey: false }
);

module.exports = mongoose.model('Conversation', conversationSchema);

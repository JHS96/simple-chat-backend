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
		senderConversationId: {
			type: String,
			required: true
		},
		receiverConversationId: {
			type: String,
			required: true
		},
		receiversMsgCopyId: {
			type: String,
			default: "Reference to the receiver's copy of the message",
			required: true
		},
		message: {
			type: String,
			required: true
		},
		isStarred: {
			type: Boolean,
			default: false,
			required: true
		},
		belongsToConversationId: {
			type: String,
			required: true
		},
		msgCopyOwner: {
			type: String,
			required: true,
			default: 'Reference to owner of this copy of the message.'
		},
		isSender: {
			type: Boolean,
			default: true,
			required: true
		},
		msgDeletedBySender: {
			type: Boolean,
			default: false,
			required: true
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);

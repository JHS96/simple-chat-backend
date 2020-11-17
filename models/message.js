const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema(
	{
		senderName: {
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
			default:
				"Same as _id of this message - This message object IS the receiver's copy.",
			required: true
		},
		message: {
			type: String,
			required: true
		},
		isSender: {
			type: Boolean,
			default: true,
			required: true
		},
		isStarred: {
			type: Boolean,
			default: false,
			required: true
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);

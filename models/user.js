const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	receivedRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	sentRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	conversations: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Conversation',
			required: true
		}
	]
});

module.exports = mongoose.model('User', userSchema);

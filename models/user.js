require('dotenv').config();
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
	{
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
		avatarUrl: {
			type: String,
			required: true,
			default: process.env.AWS_DEFAULT_AVATAR_URL
		},
		userIsOnline: {
			type: Boolean,
			required: true,
			default: false
		},
		receivedRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		sentRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		conversations: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Conversation',
				required: true
			}
		],
		isActive: {
			type: Boolean,
			default: false,
			required: true
		},
		activationToken: {
			type: String
		},
		activationTokenExpiration: {
			type: Date
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

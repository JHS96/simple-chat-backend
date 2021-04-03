require('dotenv').config();
const fs = require('fs');
const AWS = require('aws-sdk');

const User = require('../models/user');
const Conversation = require('../models/conversation');
const { genericError, catchBlockError } = require('../util/errorHandlers');

const awsConfig = () => {
	return AWS.config.update({
		accessKeyId: process.env.AWS_IAM_USER_KEY,
		secretAccessKey: process.env.AWS_IAM_USER_SECRET,
		region: process.env.AWS_REGION
	});
};

exports.deleteAvatarImg = async (req, res, next) => {
	try {
		// Find user requesting the deletion of his/her avatar image.
		const user = await User.findById(req.userId);
		if (!user) {
			return genericError('User not found.', 404, next);
		}
		if (user.avatarUrl === process.env.AWS_DEFAULT_AVATAR_URL) {
			return genericError('Cannot delete default avatar image!', 403, next);
		}
		awsConfig(); // Configuration for AWS
		const s3 = new AWS.S3();
		// Paramaters required for deleteion.
		const splitPath = user.avatarUrl.split('.com/');
		const params = {
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: decodeURIComponent(splitPath[1])
		};
		s3.deleteObject(params, async (err, data) => {
			if (err) console.log(err);
			else {
				user.avatarUrl = process.env.AWS_DEFAULT_AVATAR_URL;
				const result = await user.save();
				res.status(200).json({
					message: 'Avatar image successfully deleted.',
					newAvatarUrl: result.avatarUrl
				});
				await Conversation.updateMany(
					{ contactId: user._id },
					{ contactAvatarUrl: process.env.AWS_DEFAULT_AVATAR_URL }
				);
			}
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

exports.updateAvatarImg = async (req, res, next) => {
	if (!req.file) {
		return genericError('No file selected!', 422, next);
	}
	try {
		// Find user that wishes to update avatar image.
		const user = await User.findById(req.userId);
		if (!user) {
			return genericError('User not found', 404, next);
		}
		// Check if user uses default avatar image or custom image.
		// If user's old avatar image is a custom image, delete old image.
		if (user.avatarUrl !== process.env.AWS_DEFAULT_AVATAR_URL) {
			console.log('Custom avatar image detected - must delete.');
			awsConfig(); // Configuration for AWS
			const s3 = new AWS.S3();
			// Paramaters required for deleteion.
			const splitPath = user.avatarUrl.split('.com/');
			const params = {
				Bucket: process.env.AWS_BUCKET_NAME,
				Key: decodeURIComponent(splitPath[1])
			};
			s3.deleteObject(params, async (err, data) => {
				if (err) console.log(err);
				else console.log('Old avatar image deleted.');
			});
		}
		// Save new image.
		awsConfig(); // Configuration for AWS
		const s3 = new AWS.S3();
		const params = {
			ACL: 'public-read',
			Bucket: process.env.AWS_BUCKET_NAME,
			Body: fs.createReadStream(req.file.path),
			Key: `userAvatar/${new Date().toISOString()}-${req.file.originalname}`
		};
		s3.upload(params, async (err, data) => {
			if (err) {
				console.log('Error occured while trying to upload to S3 bucket', err);
			}
			if (data) {
				fs.unlinkSync(req.file.path); // Empty temp folder
				user.avatarUrl = data.Location;
				const result = await user.save();
				res.status(200).json({
					message: 'Avatar image sucessfully updated',
					newAvatarUrl: result.avatarUrl
				});
				await Conversation.updateMany(
					{ contactId: user._id },
					{ contactAvatarUrl: result.avatarUrl }
				);
			}
		});
	} catch (err) {
		catchBlockError(err, next);
	}
};

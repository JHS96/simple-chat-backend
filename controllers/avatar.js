require('dotenv').config();
const fs = require('fs');
const AWS = require('aws-sdk');

const User = require('../models/user');

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
			const error = new Error('User not found.');
			error.statusCode = 404;
			return next(error);
		}
		if (user.avatarUrl === process.env.AWS_DEFAULT_AVATAR_URL) {
			return res.json({ message: 'Cannot delete default avatar image!' });
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
			}
		});
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
			return next(err);
		}
	}
};

exports.updateAvatarImg = async (req, res, next) => {
	if (!req.file) {
		const error = new Error('No file selected!');
		error.statusCode = 422;
		return next(error);
	}
	try {
		// Find user that wishes to update avatar image.
		const user = await User.findById(req.userId);
		if (!user) {
			const error = new Error('User not found');
			error.statusCode = 404;
			return next(error);
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
			}
		});
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		return next(err);
	}
};

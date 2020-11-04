require('dotenv').config();
const AWS = require('aws-sdk');

const User = require('../models/user');

exports.deleteAvatarImg = async (req, res, next) => {
	try {
		// Find user requesting the deletion of his/her avatar image.
		const user = await User.findById(req.userId);
		if (user.avatarUrl === process.env.AWS_DEFAULT_AVATAR_URL) {
			return res.json({ message: 'Cannot delete default avatar image!' });
		}

		AWS.config.update({
			accessKeyId: process.env.AWS_IAM_USER_KEY,
			secretAccessKey: process.env.AWS_IAM_USER_SECRET,
			region: process.env.AWS_REGION
		});

		const s3 = new AWS.S3();
		// Paramaters required for deleteion.
		const splitPath = user.avatarUrl.split('.com/');
		const params = {
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: decodeURIComponent(splitPath[1])
		};
		s3.headObject(params);
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

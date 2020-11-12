const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendConfirmationEMail = user => {
	const msg = {
		to: user.email,
		from: process.env.SENDGRID_FROM_ADDRESS,
		subject: 'Please confirm your email address.',
		text: 'Please confirm your email address.',
		html: `
				<p>Please confirm your email address by clicking the link below.</p>
				<a href="${process.env.FRONTEND_DOMAIN}/auth/confirm/${user._id.toString()}/${
			user.activationToken
		}">${process.env.FRONTEND_DOMAIN}/auth/confirm/${user._id.toString()}/${
			user.activationToken
		}</a>
				<p>For security reasons the above confirmation link will expire in 1 hour.</p>
				`
	};
	sgMail
		.send(msg)
		.then(() => {
			console.log('Message sent.');
		})
		.catch(error => {
			console.log(error);
			throw error;
		});
};

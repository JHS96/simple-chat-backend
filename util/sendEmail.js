const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const send = msg => {
	sgMail
		.send(msg)
		.then(() => {
			console.log('Email sent.');
		})
		.catch(error => {
			console.log(error);
			throw error;
		});
};

exports.sendConfirmationEmail = user => {
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
				<p>You can safely ignore this email if it was sent to you in error.</p>
				<p>Simple Chat</p>
			`
	};
	send(msg);
};

exports.sendPasswordResetLink = user => {
	const msg = {
		to: user.email,
		from: process.env.SENDGRID_FROM_ADDRESS,
		subject: 'Password Reset',
		text: 'Password Reset',
		html: `
				<p>We have received a request to reset your password. If you did not request a password reset, or if you requested the reset by mistake, you may safely ignore this email, and your password will remain as it was before.</p>
				<p>If you did request the password reset, please click the link below.</p>
				<a href="${
					process.env.FRONTEND_DOMAIN
				}/auth/reset-password/${user._id.toString()}/${
			user.passwordResetToken
		}">${
			process.env.FRONTEND_DOMAIN
		}/auth/reset-password/${user._id.toString()}/${user.passwordResetToken}</a>
					<p>For security reasons the above reset link will expire in 1 hour.</p>
				`
	};
	send(msg);
};

// emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

const sendPasswordResetEmail = (to, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Password Reset",
    text: `You requested a password reset. Click here to reset your password: ${resetUrl}`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };

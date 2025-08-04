const nodemailer = require('nodemailer');

// In-memory store
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Use Gmail or custom SMTP config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,        // e.g. spacebierd@gmail.com
    pass: process.env.EMAIL_PASS,        // App password, not your Gmail login!
  },
});

exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  otpStore[email] = otp;

  try {
    await transporter.sendMail({
      from: `"Averulo App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Your OTP is: <strong>${otp}</strong>. It will expire in 10 minutes.</p>`,
    });

    res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.verifyOTP = (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] === otp) {
    delete otpStore[email];
    return res.json({ success: true });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
};
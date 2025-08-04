import cors from 'cors';
import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 5050;



const upload = multer({ dest: 'uploads/' }); // creates 'uploads' folder if not exists

// Route to handle ID upload (can accept two files: front and back)
app.post('/api/upload-id', upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 }
]), (req, res) => {
  const { email, idType } = req.body;
  const files = req.files; // { front: [file], back: [file] }

  if (!email || !idType || !files.front) {
    return res.status(400).json({ success: false, message: 'Missing required fields or files.' });
  }

  // Here, you can save info to DB, or just store the files for now.
  console.log('Received:', email, idType, files);

  res.json({ success: true, message: 'ID uploaded successfully!' });
});


// Simple in-memory store for demo (use Redis or DB for prod)
const otpStore = {};

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is reachable!' });
});

// Send OTP Route
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP for the email (expires in 5 mins)
    otpStore[email] = {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
    };

    // Send email with Nodemailer (use your Gmail app password)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'spacebierd@gmail.com',
        pass: 'iozlpmqctocaqpme',
      },
    });

    await transporter.sendMail({
      from: '"Averulo App" <spacebierd@gmail.com>',
      to: email,
      subject: 'Your OTP Code',
      html: `<h3>Your OTP is: ${otp}</h3>`,
    });

    console.log('OTP sent to:', email, otp);
    return res.status(200).json({ success: true, message: 'OTP sent!' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP Route
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Missing email or otp' });

  const record = otpStore[email];
  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP found for this email' });
  }
  if (record.expires < Date.now()) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'OTP expired, please request again.' });
  }
  if (record.code !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // Valid OTP — cleanup and confirm
  delete otpStore[email];
  return res.json({ success: true, message: 'OTP Verified!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
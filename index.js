// index.js
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

import { auth } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import bookingsRouter from './routes/bookings.js';
import propertiesRouter from "./routes/properties.js";
// import bookingsRouter from "./routes/bookings.js"; // uncomment when this file exists

const app = express();
const PORT = process.env.PORT || 4000;
const isDev = process.env.APP_ENV !== "production";

// ✅ helpers so routes can use “authRequired”
const authRequired = auth(true);
// const authOptional = auth(false); // use if you need optional auth

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// --- middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ensure uploads dir exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// multer (10MB per file, only images/pdf)
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g)|application\/pdf/.test(file.mimetype);
    cb(ok ? null : new Error("Invalid file type"), ok);
  },
});

// simple health
app.get("/api/test", (_req, res) => res.json({ message: "Backend is reachable!" }));

// 🔐 current user
app.get("/api/me", authRequired, async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user.sub } });
  res.json(me);
});

// --- ID upload (front/back)
app.post(
  "/api/upload-id",
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]),
  (req, res) => {
    const { email, idType } = req.body;
    const files = req.files || {};
    if (!email || !idType || !files.front?.length) {
      return res.status(400).json({ success: false, message: "Missing fields or files" });
    }
    return res.json({ success: true, message: "ID uploaded", files: Object.keys(files) });
  }
);

// --- OTP (in-memory)
const otpStore = Object.create(null);

const transporterOrNull = (() => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null;
})();

app.post("/api/send-otp", otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { code: otp, expires: Date.now() + 5 * 60 * 1000 };

  try {
    if (transporterOrNull) {
      await transporterOrNull.sendMail({
        from: process.env.EMAIL_FROM || '"Averulo" <no-reply@averulo.local>',
        to: email,
        subject: "Your OTP Code",
        html: `<h3>Your OTP is: ${otp}</h3>`,
      });
      return res.status(200).json({ success: true, message: "OTP sent!" });
    }
    throw new Error("SMTP not configured");
  } catch (err) {
    console.warn("Email send failed:", err.message);
    if (isDev) {
      return res.status(200).json({ success: true, message: "OTP (dev mode)", devOtp: otp });
    }
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

app.post("/api/verify-otp", otpLimiter, async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: "Missing email or otp" });

  const rec = otpStore[email];
  if (!rec) return res.status(400).json({ success: false, message: "No OTP found for this email" });
  if (rec.expires < Date.now()) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  if (rec.code !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

  delete otpStore[email];

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, role: "USER" } });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return res.json({ success: true, message: "OTP Verified!", token, user });
});

// mount routers
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertiesRouter);
app.use("/api/bookings", bookingsRouter); // enable when implemented

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API listening on http://0.0.0.0:${PORT}`);
});
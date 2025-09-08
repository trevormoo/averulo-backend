// lib/notify.js
import nodemailer from "nodemailer";

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || "true") === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

// fallback: console log
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log(`📧 [DEV NOTIF] To: ${to}, Subject: ${subject}\n${html}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Averulo" <no-reply@averulo.local>',
    to,
    subject,
    html,
  });
}

// === Notifications ===
export async function notifyHostBooking({ hostEmail, propertyTitle, start, end, guestEmail }) {
  const subject = `New booking request for ${propertyTitle}`;
  const html = `<p>You have a new booking from <b>${guestEmail}</b> for <b>${propertyTitle}</b>.<br/>
  Dates: ${start} → ${end}</p>`;
  await sendMail(hostEmail, subject, html);
}

export async function notifyGuestBookingStatus({ guestEmail, propertyTitle, status, start, end }) {
  const subject = `Your booking was ${status}`;
  const html = `<p>Your booking for <b>${propertyTitle}</b> (${start} → ${end}) is now <b>${status}</b>.</p>`;
  await sendMail(guestEmail, subject, html);
}

export async function notifyPaymentSuccess({ guestEmail, propertyTitle, amount, currency, reference }) {
  const subject = `Payment successful for ${propertyTitle}`;
  const html = `<p>Your payment of <b>${amount / 100} ${currency}</b> for <b>${propertyTitle}</b> succeeded.<br/>
  Ref: ${reference}</p>`;
  await sendMail(guestEmail, subject, html);
}

export async function notifyPaymentFailure({ guestEmail, propertyTitle, amount, currency, reference }) {
  const subject = `Payment failed for ${propertyTitle}`;
  const html = `<p>Your payment of <b>${amount / 100} ${currency}</b> for <b>${propertyTitle}</b> failed.<br/>
  Ref: ${reference}</p>`;
  await sendMail(guestEmail, subject, html);
}
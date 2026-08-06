const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null; // belum dikonfigurasi -> mode dev (log ke console)

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Kirim email. Jika SMTP belum dikonfigurasi (development), pesan hanya dicetak
 * ke console agar tetap bisa ditest tanpa setup email provider.
 */
async function sendMail({ to, subject, html }) {
  const t = getTransporter();

  if (!t) {
    console.log('--- [DEV] Email tidak dikirim (SMTP belum dikonfigurasi) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', html);
    console.log('--------------------------------------------------------------');
    return { devMode: true };
  }

  return t.sendMail({
    from: process.env.SMTP_FROM || 'FamFin <no-reply@famfin.app>',
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };

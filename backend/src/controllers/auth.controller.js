const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password) {
  // Minimal 8 karakter, mengandung huruf dan angka
  return password && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, familyName } = req.body;

  if (!name || !email || !password || !confirmPassword || !familyName) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Format email tidak valid.' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Password minimal 8 karakter dan mengandung huruf serta angka.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password tidak cocok.' });
  }
  if (familyName.length < 3 || familyName.length > 100) {
    return res.status(400).json({ message: 'Nama keluarga harus 3-100 karakter.' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email sudah digunakan.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });

    const tenant = await tx.tenant.create({ data: { name: familyName } });

    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
    });

    // Seed kategori default
    const incomeDefaults = ['Gaji', 'Bonus', 'Freelance', 'Bisnis', 'Investasi', 'Hadiah', 'Lainnya'];
    const expenseDefaults = ['Makanan', 'Transportasi', 'Rumah', 'Tagihan', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Belanja', 'Lainnya'];

    await tx.category.createMany({
      data: [
        ...incomeDefaults.map((n) => ({ tenantId: tenant.id, name: n, type: 'INCOME', isDefault: true })),
        ...expenseDefaults.map((n) => ({ tenantId: tenant.id, name: n, type: 'EXPENSE', isDefault: true })),
      ],
    });

    return { user, tenant };
  });

  const token = signToken({ userId: result.user.id });

  res.status(201).json({
    message: 'Registrasi berhasil.',
    token,
    user: { id: result.user.id, name: result.user.name, email: result.user.email },
    tenant: { id: result.tenant.id, name: result.tenant.name },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { tenant: true },
  });

  const token = signToken({ userId: user.id });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    tenants: memberships.map((m) => ({ id: m.tenant.id, name: m.tenant.name, role: m.role })),
  });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  // Selalu balas sukses agar tidak bocorkan keberadaan email (security best practice)
  if (!user) {
    return res.json({ message: 'Jika email terdaftar, instruksi reset password telah dikirim.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // berlaku 1 jam

  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: 'Reset Password FamFin',
    html: `<p>Halo ${user.name},</p>
      <p>Anda meminta reset password. Klik link berikut untuk membuat password baru (berlaku 1 jam):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Jika Anda tidak meminta ini, abaikan email ini.</p>`,
  });

  res.json({ message: 'Jika email terdaftar, instruksi reset password telah dikirim.' });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' });
  }
  if (!validatePassword(newPassword)) {
    return res.status(400).json({ message: 'Password minimal 8 karakter dan mengandung huruf serta angka.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Password tidak cocok.' });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Link reset password tidak valid atau sudah kedaluwarsa.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: 'Password berhasil diubah. Silakan login dengan password baru.' });
});

module.exports = { register, login, forgotPassword, resetPassword };

const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password) {
  return password && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

// GET /api/members -> daftar anggota tenant aktif
const listMembers = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const where = { tenantId: req.tenantId };

  const [members, total] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { invitedAt: 'asc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    }),
    prisma.membership.count({ where }),
  ]);

  res.json({
    items: members.map((m) => ({
      membershipId: m.id,
      user: m.user,
      role: m.role,
      status: m.status,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
    })),
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  });
});

// POST /api/members -> Owner/Admin buat akun anggota baru secara langsung (nama, email, password, role).
// Password dibuat oleh Owner/Admin dan diserahkan manual ke user yang bersangkutan (bukan via email).
const createMember = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name) return res.status(400).json({ message: 'Nama wajib diisi.' });
  if (!email || !EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Email tidak valid.' });
  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Password minimal 8 karakter dan mengandung huruf serta angka.' });
  }
  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ message: 'Role tidak valid.' });
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // User sudah pernah terdaftar (di tenant lain) -> tinggal tambahkan sebagai anggota tenant ini.
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: req.tenantId } },
    });
    if (existingMembership) {
      return res.status(409).json({ message: 'User dengan email ini sudah menjadi anggota keluarga ini.' });
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({ data: { name, email, passwordHash } });
  }

  const membership = await prisma.membership.create({
    data: { userId: user.id, tenantId: req.tenantId, role, status: 'ACTIVE', joinedAt: new Date() },
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Membership', recordId: membership.id, newValue: membership });

  res.status(201).json({
    membershipId: membership.id,
    user: { id: user.id, name: user.name, email: user.email },
    role: membership.role,
    status: membership.status,
    // Password hanya dikembalikan sekali di response ini, tidak pernah disimpan/ditampilkan lagi setelahnya.
    // Owner wajib menyerahkan ini secara manual (langsung/chat pribadi) ke user yang bersangkutan.
    temporaryPassword: password,
  });
});

// PATCH /api/members/:membershipId/role -> ubah role anggota
const updateMemberRole = asyncHandler(async (req, res) => {
  const { membershipId } = req.params;
  const { role } = req.body;
  if (!['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ message: 'Role tidak valid.' });
  }

  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId: req.tenantId } });
  if (!membership) return res.status(404).json({ message: 'Anggota tidak ditemukan.' });

  if (membership.userId === req.user.id) {
    return res.status(400).json({ message: 'Anda tidak dapat mengubah role diri sendiri.' });
  }

  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'Membership', recordId: membershipId, oldValue: membership, newValue: updated });
  res.json(updated);
});

// DELETE /api/members/:membershipId -> keluarkan anggota (histori transaksi tetap tersimpan)
const removeMember = asyncHandler(async (req, res) => {
  const { membershipId } = req.params;
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, tenantId: req.tenantId } });
  if (!membership) return res.status(404).json({ message: 'Anggota tidak ditemukan.' });
  if (membership.role === 'OWNER') {
    return res.status(400).json({ message: 'Owner tidak dapat dikeluarkan dari keluarga.' });
  }

  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { status: 'INACTIVE' } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'DELETE', module: 'Membership', recordId: membershipId, oldValue: membership });
  res.json({ message: 'Anggota berhasil dikeluarkan dari keluarga.', membership: updated });
});

module.exports = { listMembers, createMember, updateMemberRole, removeMember };

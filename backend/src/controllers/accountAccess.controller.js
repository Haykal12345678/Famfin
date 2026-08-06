const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

// GET /api/accounts/:accountId/access -> daftar akses user ke rekening tertentu
const listAccountAccess = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const account = await prisma.account.findFirst({ where: { id: accountId, tenantId: req.tenantId } });
  if (!account) return res.status(404).json({ message: 'Rekening tidak ditemukan.' });

  const list = await prisma.accountAccess.findMany({
    where: { accountId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json(list);
});

// PUT /api/accounts/:accountId/access/:userId -> set/update level akses user pada rekening
const setAccountAccess = asyncHandler(async (req, res) => {
  const { accountId, userId } = req.params;
  const { canView, canCreateTx, canEditTx, canDeleteTx, canManage } = req.body;

  const account = await prisma.account.findFirst({ where: { id: accountId, tenantId: req.tenantId } });
  if (!account) return res.status(404).json({ message: 'Rekening tidak ditemukan.' });

  const membership = await prisma.membership.findFirst({ where: { userId, tenantId: req.tenantId } });
  if (!membership) return res.status(404).json({ message: 'User bukan anggota keluarga ini.' });

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Anda tidak dapat mengubah permission diri sendiri.' });
  }

  const data = {
    canView: canView ?? true,
    canCreateTx: !!canCreateTx,
    canEditTx: !!canEditTx,
    canDeleteTx: !!canDeleteTx,
    canManage: !!canManage,
  };

  const access = await prisma.accountAccess.upsert({
    where: { accountId_userId: { accountId, userId } },
    update: data,
    create: { accountId, userId, ...data },
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'AccountAccess', recordId: access.id, newValue: access });
  res.json(access);
});

module.exports = { listAccountAccess, setAccountAccess };

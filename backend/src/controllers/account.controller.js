const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

// GET /api/accounts -> daftar rekening yang boleh dilihat user
const listAccounts = asyncHandler(async (req, res) => {
  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(req.membership.role);

  const accounts = await prisma.account.findMany({
    where: {
      tenantId: req.tenantId,
      ...(isOwnerOrAdmin ? {} : { accesses: { some: { userId: req.user.id, canView: true } } }),
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(accounts);
});

// POST /api/accounts -> buat rekening baru (Owner/Admin)
const createAccount = asyncHandler(async (req, res) => {
  const { name, type, accountNumber, initialBalance, initialBalanceDate, description } = req.body;

  if (!name) return res.status(400).json({ message: 'Nama rekening wajib diisi.' });
  if (!['BANK', 'CASH', 'EWALLET', 'SAVINGS', 'OTHER'].includes(type)) {
    return res.status(400).json({ message: 'Jenis rekening tidak valid.' });
  }
  if (initialBalance !== undefined && Number(initialBalance) < 0) {
    return res.status(400).json({ message: 'Saldo awal tidak boleh negatif.' });
  }

  const duplicate = await prisma.account.findUnique({ where: { tenantId_name: { tenantId: req.tenantId, name } } });
  if (duplicate) return res.status(409).json({ message: 'Nama rekening sudah digunakan.' });

  const balance = initialBalance ?? 0;
  const account = await prisma.account.create({
    data: {
      tenantId: req.tenantId,
      name,
      type,
      accountNumber,
      initialBalance: balance,
      currentBalance: balance,
      initialBalanceDate: initialBalanceDate ? new Date(initialBalanceDate) : new Date(),
      description,
    },
  });

  // Owner otomatis full access; berikan juga full access ke pembuat jika bukan owner.
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Account', recordId: account.id, newValue: account });
  res.status(201).json(account);
});

// PATCH /api/accounts/:id -> edit rekening
const updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const account = await prisma.account.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!account) return res.status(404).json({ message: 'Rekening tidak ditemukan.' });

  const { name, accountNumber, description, isActive } = req.body;
  const updated = await prisma.account.update({
    where: { id },
    data: { ...(name && { name }), accountNumber, description, ...(isActive !== undefined && { isActive }) },
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'Account', recordId: id, oldValue: account, newValue: updated });
  res.json(updated);
});

// DELETE /api/accounts/:id -> nonaktifkan rekening (tidak hard delete, agar histori aman)
const deactivateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const account = await prisma.account.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!account) return res.status(404).json({ message: 'Rekening tidak ditemukan.' });

  const updated = await prisma.account.update({ where: { id }, data: { isActive: false } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'DELETE', module: 'Account', recordId: id, oldValue: account });
  res.json(updated);
});

module.exports = { listAccounts, createAccount, updateAccount, deactivateAccount };

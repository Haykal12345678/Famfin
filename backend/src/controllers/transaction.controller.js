const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

// Cegah duplicate submit: tolak jika ada transaksi identik dibuat < 5 detik lalu oleh user yang sama.
async function isDuplicateSubmit({ tenantId, userId, accountId, amount, date }) {
  const fiveSecAgo = new Date(Date.now() - 5000);
  const dup = await prisma.transaction.findFirst({
    where: { tenantId, userId, accountId, amount, date: new Date(date), createdAt: { gte: fiveSecAgo } },
  });
  return !!dup;
}

// POST /api/transactions/income
const createIncome = asyncHandler(async (req, res) => {
  const { accountId, categoryId, amount, date, note } = req.body;

  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Nominal harus lebih besar dari 0.' });
  if (!date) return res.status(400).json({ message: 'Tanggal wajib diisi.' });

  const account = req.account; // sudah divalidasi requireAccountAccess + aktif di route
  if (!account.isActive) return res.status(400).json({ message: 'Rekening nonaktif tidak dapat digunakan untuk transaksi baru.' });

  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId: req.tenantId, type: 'INCOME', isActive: true } });
  if (!category) return res.status(400).json({ message: 'Kategori pemasukan tidak valid atau nonaktif.' });

  if (await isDuplicateSubmit({ tenantId: req.tenantId, userId: req.user.id, accountId, amount, date })) {
    return res.status(409).json({ message: 'Transaksi terdeteksi duplikat (double submit). Silakan cek riwayat transaksi.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const trx = await tx.transaction.create({
      data: { tenantId: req.tenantId, type: 'INCOME', accountId, categoryId, amount, date: new Date(date), note, userId: req.user.id },
    });
    await tx.account.update({ where: { id: accountId }, data: { currentBalance: { increment: amount } } });
    return trx;
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Transaction', recordId: result.id, newValue: result });
  res.status(201).json(result);
});

// POST /api/transactions/expense
const createExpense = asyncHandler(async (req, res) => {
  const { accountId, categoryId, amount, date, note, confirmLowBalance } = req.body;

  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Nominal harus lebih besar dari 0.' });
  if (!date) return res.status(400).json({ message: 'Tanggal wajib diisi.' });

  const account = req.account;
  if (!account.isActive) return res.status(400).json({ message: 'Rekening nonaktif tidak dapat digunakan untuk transaksi baru.' });

  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId: req.tenantId, type: 'EXPENSE', isActive: true } });
  if (!category) return res.status(400).json({ message: 'Kategori pengeluaran tidak valid atau nonaktif.' });

  if (await isDuplicateSubmit({ tenantId: req.tenantId, userId: req.user.id, accountId, amount, date })) {
    return res.status(409).json({ message: 'Transaksi terdeteksi duplikat (double submit). Silakan cek riwayat transaksi.' });
  }

  // Warning saldo tidak cukup - MVP: tetap bisa disimpan setelah konfirmasi
  if (Number(account.currentBalance) < Number(amount) && !confirmLowBalance) {
    return res.status(409).json({
      code: 'LOW_BALANCE_WARNING',
      message: 'Saldo rekening tidak mencukupi. Kirim ulang dengan confirmLowBalance=true untuk tetap menyimpan.',
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const trx = await tx.transaction.create({
      data: { tenantId: req.tenantId, type: 'EXPENSE', accountId, categoryId, amount, date: new Date(date), note, userId: req.user.id },
    });
    await tx.account.update({ where: { id: accountId }, data: { currentBalance: { decrement: amount } } });
    return trx;
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Transaction', recordId: result.id, newValue: result });
  res.status(201).json(result);
});

// POST /api/transactions/transfer
const createTransfer = asyncHandler(async (req, res) => {
  const { fromAccountId, toAccountId, amount, date, note } = req.body;

  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Nominal harus lebih besar dari 0.' });
  if (!fromAccountId || !toAccountId) return res.status(400).json({ message: 'Rekening sumber dan tujuan wajib diisi.' });
  if (fromAccountId === toAccountId) return res.status(400).json({ message: 'Rekening sumber dan tujuan harus berbeda.' });

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: fromAccountId, tenantId: req.tenantId } }),
    prisma.account.findFirst({ where: { id: toAccountId, tenantId: req.tenantId } }),
  ]);
  if (!fromAccount || !toAccount) return res.status(404).json({ message: 'Rekening tidak ditemukan.' });
  if (!fromAccount.isActive || !toAccount.isActive) return res.status(400).json({ message: 'Rekening nonaktif tidak dapat digunakan untuk transaksi.' });

  // Validasi akses ke kedua rekening (Owner selalu lolos)
  if (req.membership.role !== 'OWNER') {
    const [accessFrom, accessTo] = await Promise.all([
      prisma.accountAccess.findUnique({ where: { accountId_userId: { accountId: fromAccountId, userId: req.user.id } } }),
      prisma.accountAccess.findUnique({ where: { accountId_userId: { accountId: toAccountId, userId: req.user.id } } }),
    ]);
    if (!accessFrom?.canCreateTx || !accessTo?.canCreateTx) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke salah satu rekening.' });
    }
  }

  const transferGroupId = uuidv4();

  const result = await prisma.$transaction(async (tx) => {
    const out = await tx.transaction.create({
      data: { tenantId: req.tenantId, type: 'TRANSFER', accountId: fromAccountId, toAccountId, amount, date: new Date(date), note, userId: req.user.id, transferGroupId },
    });
    const inTrx = await tx.transaction.create({
      data: { tenantId: req.tenantId, type: 'TRANSFER', accountId: toAccountId, toAccountId: fromAccountId, amount, date: new Date(date), note, userId: req.user.id, transferGroupId },
    });
    await tx.account.update({ where: { id: fromAccountId }, data: { currentBalance: { decrement: amount } } });
    await tx.account.update({ where: { id: toAccountId }, data: { currentBalance: { increment: amount } } });
    return { out, inTrx };
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Transaction', recordId: transferGroupId, newValue: result });
  res.status(201).json({ transferGroupId, ...result });
});

// DELETE /api/transactions/transfer/:transferGroupId -> batalkan transfer (kedua sisi)
const cancelTransfer = asyncHandler(async (req, res) => {
  const { transferGroupId } = req.params;
  const legs = await prisma.transaction.findMany({ where: { transferGroupId, tenantId: req.tenantId } });
  if (legs.length === 0) return res.status(404).json({ message: 'Transfer tidak ditemukan.' });

  await prisma.$transaction(async (tx) => {
    for (const leg of legs) {
      // Kembalikan saldo (reverse dari efek transfer)
      const isOutgoing = leg.accountId && leg.toAccountId; // both legs have both fields; determine sign by comparing order
    }
    // Reverse balances: leg1 was -amount on accountId, leg2 was +amount on accountId
    // We stored both legs symmetric, so reverse each leg's effect based on chronological order.
    const [first, second] = legs.sort((a, b) => a.createdAt - b.createdAt);
    await tx.account.update({ where: { id: first.accountId }, data: { currentBalance: { increment: first.amount } } });
    await tx.account.update({ where: { id: second.accountId }, data: { currentBalance: { decrement: second.amount } } });
    await tx.transaction.deleteMany({ where: { transferGroupId } });
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'DELETE', module: 'Transaction', recordId: transferGroupId, oldValue: legs });
  res.json({ message: 'Transfer berhasil dibatalkan.' });
});

// GET /api/transactions -> riwayat transaksi dengan filter
const listTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate, type, categoryId, accountId, userId, minAmount, maxAmount, page = 1, pageSize = 20 } = req.query;

  // Batasi ke rekening yang boleh diakses user (kecuali Owner/Admin)
  let allowedAccountIds = null;
  if (!['OWNER', 'ADMIN'].includes(req.membership.role)) {
    const accesses = await prisma.accountAccess.findMany({ where: { userId: req.user.id, canView: true }, select: { accountId: true } });
    allowedAccountIds = accesses.map((a) => a.accountId);
  }

  const where = {
    tenantId: req.tenantId,
    ...(type && { type }),
    ...(categoryId && { categoryId }),
    ...(userId && { userId }),
    ...(accountId ? { accountId } : allowedAccountIds ? { accountId: { in: allowedAccountIds } } : {}),
    ...(startDate || endDate
      ? { date: { ...(startDate && { gte: new Date(startDate) }), ...(endDate && { lte: new Date(endDate) }) } }
      : {}),
    ...(minAmount || maxAmount
      ? { amount: { ...(minAmount && { gte: Number(minAmount) }), ...(maxAmount && { lte: Number(maxAmount) }) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: true, toAccount: true, user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
});

module.exports = { createIncome, createExpense, createTransfer, cancelTransfer, listTransactions };

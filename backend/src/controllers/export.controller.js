const asyncHandler = require('express-async-handler');
const { Parser } = require('json2csv');
const prisma = require('../utils/prisma');
const { getAllowedAccountFilter } = require('./report.controller');

// GET /api/export/transactions?startDate&endDate&type&categoryId&accountId
const exportTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate, type, categoryId, accountId } = req.query;
  const accountFilter = await getAllowedAccountFilter(req);

  const items = await prisma.transaction.findMany({
    where: {
      tenantId: req.tenantId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(accountId ? { accountId } : accountFilter),
      ...(startDate && endDate && { date: { gte: new Date(startDate), lte: new Date(endDate) } }),
    },
    include: { category: true, account: true, user: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });

  const rows = items.map((t) => ({
    tanggal: t.date.toISOString().slice(0, 10),
    jenis: t.type,
    kategori: t.category?.name || '-',
    rekening: t.account?.name || '-',
    nominal: Number(t.amount),
    catatan: t.note || '',
    user: t.user?.name || '-',
  }));

  const parser = new Parser({ fields: ['tanggal', 'jenis', 'kategori', 'rekening', 'nominal', 'catatan', 'user'] });
  const csv = parser.parse(rows);

  res.header('Content-Type', 'text/csv');
  res.attachment(`transaksi-${Date.now()}.csv`);
  res.send(csv);
});

module.exports = { exportTransactions };

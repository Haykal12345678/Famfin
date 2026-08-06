const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

function statusFor(pct) {
  if (pct > 100) return 'MELEBIHI_BUDGET';
  if (pct >= 90) return 'HAMPIR_HABIS';
  if (pct >= 70) return 'PERHATIAN';
  return 'AMAN';
}

// GET /api/budgets?period=YYYY-MM
const listBudgets = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const budgets = await prisma.budget.findMany({
    where: { tenantId: req.tenantId, ...(period && { period }) },
    include: { category: true },
  });

  const enriched = await Promise.all(
    budgets.map(async (b) => {
      const [year, month] = b.period.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);

      const used = await prisma.transaction.aggregate({
        where: { tenantId: req.tenantId, type: 'EXPENSE', categoryId: b.categoryId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });

      const usedAmount = Number(used._sum.amount || 0);
      const pct = Number(b.amount) > 0 ? (usedAmount / Number(b.amount)) * 100 : 0;

      return {
        ...b,
        used: usedAmount,
        remaining: Number(b.amount) - usedAmount,
        percentage: Math.round(pct * 100) / 100,
        status: statusFor(pct),
      };
    })
  );

  res.json(enriched);
});

// POST /api/budgets
const createBudget = asyncHandler(async (req, res) => {
  const { categoryId, period, amount } = req.body;
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Budget harus lebih besar dari 0.' });
  if (!/^\d{4}-\d{2}$/.test(period)) return res.status(400).json({ message: 'Format periode harus YYYY-MM.' });

  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId: req.tenantId, type: 'EXPENSE' } });
  if (!category) return res.status(400).json({ message: 'Kategori harus kategori pengeluaran yang valid.' });

  const duplicate = await prisma.budget.findUnique({ where: { tenantId_categoryId_period: { tenantId: req.tenantId, categoryId, period } } });
  if (duplicate) return res.status(409).json({ message: 'Budget aktif untuk kategori dan periode ini sudah ada.' });

  const budget = await prisma.budget.create({ data: { tenantId: req.tenantId, categoryId, period, amount } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Budget', recordId: budget.id, newValue: budget });
  res.status(201).json(budget);
});

// PATCH /api/budgets/:id
const updateBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Budget harus lebih besar dari 0.' });

  const budget = await prisma.budget.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!budget) return res.status(404).json({ message: 'Budget tidak ditemukan.' });

  const updated = await prisma.budget.update({ where: { id }, data: { amount } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'Budget', recordId: id, oldValue: budget, newValue: updated });
  res.json(updated);
});

// DELETE /api/budgets/:id
const deleteBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const budget = await prisma.budget.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!budget) return res.status(404).json({ message: 'Budget tidak ditemukan.' });

  await prisma.budget.delete({ where: { id } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'DELETE', module: 'Budget', recordId: id, oldValue: budget });
  res.json({ message: 'Budget berhasil dihapus.' });
});

module.exports = { listBudgets, createBudget, updateBudget, deleteBudget };

const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

// GET /api/goals
const listGoals = asyncHandler(async (req, res) => {
  const goals = await prisma.financialGoal.findMany({ where: { tenantId: req.tenantId }, include: { account: true } });
  const enriched = goals.map((g) => {
    const progress = Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
    return {
      ...g,
      progressPercentage: Math.round(progress * 100) / 100,
      shortfall: Math.max(Number(g.targetAmount) - Number(g.currentAmount), 0),
    };
  });
  res.json(enriched);
});

// POST /api/goals
const createGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, initialAmount = 0, targetDate, accountId, description } = req.body;

  if (!name) return res.status(400).json({ message: 'Nama target wajib diisi.' });
  if (!(Number(targetAmount) > 0)) return res.status(400).json({ message: 'Target nominal harus lebih besar dari 0.' });
  if (Number(initialAmount) > Number(targetAmount)) return res.status(400).json({ message: 'Nominal awal tidak boleh melebihi target.' });
  // Normalize dates to date-only (midnight) to avoid timezone issues
  const targetDateObj = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDateObj.setHours(0, 0, 0, 0);
  if (isNaN(targetDateObj.getTime()) || targetDateObj < today) {
    return res.status(400).json({ message: 'Target tanggal tidak boleh sebelum tanggal dibuat.' });
  }

  const account = await prisma.account.findFirst({ where: { id: accountId, tenantId: req.tenantId, isActive: true } });
  if (!account) return res.status(400).json({ message: 'Rekening tujuan tidak valid atau nonaktif.' });

  console.log('createGoal body:', { tenantId: req.tenantId, name, targetAmount, initialAmount, targetDate, accountId });
  const goal = await prisma.financialGoal.create({
    data: { tenantId: req.tenantId, name, targetAmount, initialAmount, currentAmount: initialAmount, targetDate: targetDateObj, accountId, description },
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'FinancialGoal', recordId: goal.id, newValue: goal });
  res.status(201).json(goal);
});

// PATCH /api/goals/:id/contribute -> tambah tabungan ke target
const contributeGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Nominal harus lebih besar dari 0.' });

  const goal = await prisma.financialGoal.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!goal) return res.status(404).json({ message: 'Target tabungan tidak ditemukan.' });

  const updated = await prisma.financialGoal.update({ where: { id }, data: { currentAmount: { increment: amount } } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'FinancialGoal', recordId: id, oldValue: goal, newValue: updated });
  res.json(updated);
});

// DELETE /api/goals/:id
const deleteGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const goal = await prisma.financialGoal.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!goal) return res.status(404).json({ message: 'Target tabungan tidak ditemukan.' });

  await prisma.financialGoal.delete({ where: { id } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'DELETE', module: 'FinancialGoal', recordId: id, oldValue: goal });
  res.json({ message: 'Target tabungan berhasil dihapus.' });
});

// PATCH /api/goals/:id
const updateGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, targetAmount, targetDate, accountId, description } = req.body;

  if (!name) return res.status(400).json({ message: 'Nama target wajib diisi.' });
  if (!(Number(targetAmount) > 0)) return res.status(400).json({ message: 'Target nominal harus lebih besar dari 0.' });

  const goal = await prisma.financialGoal.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!goal) return res.status(404).json({ message: 'Target tabungan tidak ditemukan.' });
  if (Number(goal.currentAmount) > Number(targetAmount)) {
    return res.status(400).json({ message: 'Target nominal tidak boleh kurang dari jumlah yang sudah terkumpul.' });
  }

  if (new Date(targetDate) < new Date(new Date().toDateString())) {
    return res.status(400).json({ message: 'Target tanggal tidak boleh sebelum tanggal sekarang.' });
  }

  const account = await prisma.account.findFirst({ where: { id: accountId, tenantId: req.tenantId, isActive: true } });
  if (!account) return res.status(400).json({ message: 'Rekening tujuan tidak valid atau nonaktif.' });

  const updated = await prisma.financialGoal.update({
    where: { id },
    data: {
      name,
      targetAmount,
      targetDate: new Date(targetDate),
      accountId,
      description,
    },
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'FinancialGoal', recordId: id, oldValue: goal, newValue: updated });
  res.json(updated);
});

module.exports = { listGoals, createGoal, contributeGoal, deleteGoal, updateGoal };

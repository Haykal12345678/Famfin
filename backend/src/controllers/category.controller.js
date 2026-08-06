const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

// GET /api/categories?type=INCOME|EXPENSE
const listCategories = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const categories = await prisma.category.findMany({
    where: { tenantId: req.tenantId, isActive: true, ...(type && { type }) },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

// POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi.' });
  if (!['INCOME', 'EXPENSE'].includes(type)) return res.status(400).json({ message: 'Jenis kategori tidak valid.' });

  const duplicate = await prisma.category.findUnique({ where: { tenantId_name_type: { tenantId: req.tenantId, name, type } } });
  if (duplicate) return res.status(409).json({ message: 'Kategori dengan nama dan jenis ini sudah ada.' });

  const category = await prisma.category.create({ data: { tenantId: req.tenantId, name, type } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', module: 'Category', recordId: category.id, newValue: category });
  res.status(201).json(category);
});

// PATCH /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const category = await prisma.category.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan.' });

  const updated = await prisma.category.update({ where: { id }, data: { name } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'Category', recordId: id, oldValue: category, newValue: updated });
  res.json(updated);
});

// DELETE /api/categories/:id -> nonaktifkan (soft delete), tidak dihapus permanen jika sudah dipakai
const deactivateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await prisma.category.findFirst({ where: { id, tenantId: req.tenantId } });
  if (!category) return res.status(404).json({ message: 'Kategori tidak ditemukan.' });

  const updated = await prisma.category.update({ where: { id }, data: { isActive: false } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'DELETE', module: 'Category', recordId: id, oldValue: category });
  res.json(updated);
});

module.exports = { listCategories, createCategory, updateCategory, deactivateCategory };

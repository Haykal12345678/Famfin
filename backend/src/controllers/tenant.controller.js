const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

// GET /api/tenants  -> daftar family/tenant milik user login
const listMyTenants = asyncHandler(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id, status: 'ACTIVE' },
    include: { tenant: true },
  });
  res.json(memberships.map((m) => ({ id: m.tenant.id, name: m.tenant.name, logoUrl: m.tenant.logoUrl, role: m.role })));
});

// POST /api/tenants -> buat family baru (user login jadi Owner)
const createTenant = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || name.length < 3 || name.length > 100) {
    return res.status(400).json({ message: 'Nama keluarga harus 3-100 karakter.' });
  }

  const tenant = await prisma.tenant.create({ data: { name } });
  await prisma.membership.create({
    data: { userId: req.user.id, tenantId: tenant.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
  });

  await writeAudit({ tenantId: tenant.id, userId: req.user.id, action: 'CREATE', module: 'Tenant', recordId: tenant.id, newValue: tenant });
  res.status(201).json(tenant);
});

// PATCH /api/tenants/current -> edit nama / logo (perlu X-Tenant-Id)
const updateTenant = asyncHandler(async (req, res) => {
  const { name, logoUrl } = req.body;
  if (name && (name.length < 3 || name.length > 100)) {
    return res.status(400).json({ message: 'Nama keluarga harus 3-100 karakter.' });
  }

  const before = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
  const updated = await prisma.tenant.update({
    where: { id: req.tenantId },
    data: { ...(name && { name }), ...(logoUrl && { logoUrl }) },
  });

  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'Tenant', recordId: req.tenantId, oldValue: before, newValue: updated });
  res.json(updated);
});

// PATCH /api/tenants/current/deactivate -> nonaktifkan family (Owner only)
const deactivateTenant = asyncHandler(async (req, res) => {
  const updated = await prisma.tenant.update({ where: { id: req.tenantId }, data: { isActive: false } });
  await writeAudit({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', module: 'Tenant', recordId: req.tenantId, newValue: { isActive: false } });
  res.json(updated);
});

module.exports = { listMyTenants, createTenant, updateTenant, deactivateTenant };

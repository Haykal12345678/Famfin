const prisma = require('../utils/prisma');

/**
 * Mewajibkan header X-Tenant-Id pada setiap request ke data keluarga.
 * Memastikan user adalah anggota AKTIF dari tenant tersebut (tenant isolation).
 * Menempelkan req.tenantId dan req.membership (berisi role).
 */
async function requireTenant(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ message: 'Header X-Tenant-Id wajib disertakan.' });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: req.user.id, tenantId } },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke keluarga/workspace ini.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ message: 'Family/Tenant tidak ditemukan atau nonaktif.' });
    }

    req.tenantId = tenantId;
    req.membership = membership; // { role, status, ... }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireTenant };

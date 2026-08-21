const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

const isOwner = (membership) => {
  return membership?.role === 'OWNER';
};

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(membership?.role);
};


/*
|--------------------------------------------------------------------------
| GET /api/tenants
|
| Daftar family / tenant yang dimiliki user sebagai member.
|
| Semua user boleh melihat tenant yang memang mereka ikuti.
|--------------------------------------------------------------------------
*/

const listMyTenants = asyncHandler(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: {
      userId: req.user.id,
      status: 'ACTIVE',
    },

    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          isActive: true,
        },
      },
    },

    orderBy: {
      joinedAt: 'asc',
    },
  });

  res.json(
    memberships
      .filter((m) => m.tenant?.isActive !== false)
      .map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        logoUrl: m.tenant.logoUrl,
        role: m.role,
      }))
  );
});


/*
|--------------------------------------------------------------------------
| POST /api/tenants
|
| Membuat family baru.
|
| User yang membuat family otomatis menjadi OWNER.
|
| Tidak membutuhkan membership sebelumnya karena tenant baru dibuat
| pada endpoint ini.
|--------------------------------------------------------------------------
*/

const createTenant = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const tenantName = String(name || '').trim();

  if (!tenantName) {
    return res.status(400).json({
      message: 'Nama keluarga wajib diisi.',
    });
  }

  if (tenantName.length < 3 || tenantName.length > 100) {
    return res.status(400).json({
      message: 'Nama keluarga harus 3-100 karakter.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Create tenant + OWNER membership
  |--------------------------------------------------------------------------
  */

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        isActive: true,
      },
    });

    const membership = await tx.membership.create({
      data: {
        userId: req.user.id,
        tenantId: tenant.id,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    return {
      tenant,
      membership,
    };
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId: result.tenant.id,
    userId: req.user.id,
    action: 'CREATE',
    module: 'Tenant',
    recordId: result.tenant.id,
    newValue: result.tenant,
  });

  res.status(201).json({
    id: result.tenant.id,
    name: result.tenant.name,
    logoUrl: result.tenant.logoUrl,
    role: result.membership.role,
  });
});


/*
|--------------------------------------------------------------------------
| PATCH /api/tenants/current
|
| OWNER / ADMIN
|   -> boleh edit nama dan logo family.
|
| MEMBER
|   -> tidak boleh.
|
| VIEWER
|   -> tidak boleh.
|--------------------------------------------------------------------------
*/

const updateTenant = asyncHandler(async (req, res) => {
  const membership = req.membership;

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  if (!isOwnerOrAdmin(membership)) {
    return res.status(403).json({
      message: 'Hanya Owner atau Admin yang dapat mengubah informasi keluarga.',
    });
  }

  const { name, logoUrl } = req.body;

  const tenantName =
    name !== undefined
      ? String(name).trim()
      : undefined;

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  if (
    tenantName !== undefined &&
    (tenantName.length < 3 || tenantName.length > 100)
  ) {
    return res.status(400).json({
      message: 'Nama keluarga harus 3-100 karakter.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Pastikan tenant masih aktif
  |--------------------------------------------------------------------------
  */

  const before = await prisma.tenant.findFirst({
    where: {
      id: req.tenantId,
      isActive: true,
    },
  });

  if (!before) {
    return res.status(404).json({
      message: 'Family tidak ditemukan atau sudah dinonaktifkan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.tenant.update({
    where: {
      id: req.tenantId,
    },

    data: {
      ...(tenantName !== undefined && {
        name: tenantName,
      }),

      ...(logoUrl !== undefined && {
        logoUrl:
          logoUrl === null
            ? null
            : String(logoUrl).trim() || null,
      }),
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'UPDATE',
    module: 'Tenant',
    recordId: req.tenantId,
    oldValue: before,
    newValue: updated,
  });

  res.json(updated);
});


/*
|--------------------------------------------------------------------------
| PATCH /api/tenants/current/deactivate
|
| HANYA OWNER
|
| Family tidak dihapus secara permanen.
| Hanya diubah menjadi isActive = false.
|--------------------------------------------------------------------------
*/

const deactivateTenant = asyncHandler(async (req, res) => {
  const membership = req.membership;

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  if (!isOwner(membership)) {
    return res.status(403).json({
      message: 'Hanya Owner yang dapat menonaktifkan family.',
    });
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: req.tenantId,
    },
  });

  if (!tenant) {
    return res.status(404).json({
      message: 'Family tidak ditemukan.',
    });
  }

  if (!tenant.isActive) {
    return res.status(400).json({
      message: 'Family sudah dinonaktifkan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Soft deactivate
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.tenant.update({
    where: {
      id: req.tenantId,
    },

    data: {
      isActive: false,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId: req.tenantId,
    userId: req.user.id,
    action: 'UPDATE',
    module: 'Tenant',
    recordId: req.tenantId,
    oldValue: tenant,
    newValue: updated,
  });

  res.json({
    message: 'Family berhasil dinonaktifkan.',
    tenant: updated,
  });
});


module.exports = {
  listMyTenants,
  createTenant,
  updateTenant,
  deactivateTenant,
};
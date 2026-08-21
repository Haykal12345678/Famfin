const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(membership?.role);
};

const getAccount = async (accountId, tenantId) => {
  return prisma.account.findFirst({
    where: {
      id: accountId,
      tenantId,
    },
  });
};

const getActiveMembership = async (userId, tenantId) => {
  return prisma.membership.findFirst({
    where: {
      userId,
      tenantId,
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

/*
|--------------------------------------------------------------------------
| GET /api/accounts/:accountId/access
|
| OWNER / ADMIN
|   -> boleh melihat daftar permission account
|
| MEMBER / VIEWER
|   -> forbidden
|--------------------------------------------------------------------------
*/

const listAccountAccess = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const tenantId = req.tenantId;
  const membership = req.membership;

  /*
  |--------------------------------------------------------------------------
  | Authorization
  |--------------------------------------------------------------------------
  */

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  if (!isOwnerOrAdmin(membership)) {
    return res.status(403).json({
      message: 'Hanya Owner atau Admin yang dapat melihat akses rekening.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Account validation
  |--------------------------------------------------------------------------
  */

  const account = await getAccount(accountId, tenantId);

  if (!account) {
    return res.status(404).json({
      message: 'Rekening tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Ambil semua member ACTIVE tenant
  |
  | LEFT JOIN secara aplikasi:
  | - member yang sudah punya AccountAccess
  |   -> tampil dengan permission
  |
  | - member yang belum punya AccountAccess
  |   -> tetap tampil dengan permission false
  |
  | Ini lebih enak untuk frontend Account Access Panel.
  |--------------------------------------------------------------------------
  */

  const memberships = await prisma.membership.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  });

  const accesses = await prisma.accountAccess.findMany({
    where: {
      accountId,
    },
  });

  const accessMap = new Map(
    accesses.map((access) => [access.userId, access])
  );

  const result = memberships.map((member) => {
    const access = accessMap.get(member.userId);

    /*
     * OWNER selalu full access.
     */
    if (member.role === 'OWNER') {
      return {
        id: access?.id || null,
        accountId,
        userId: member.userId,

        user: member.user,

        role: member.role,

        canView: true,
        canCreateTx: true,
        canEditTx: true,
        canDeleteTx: true,
        canManage: true,

        isOwner: true,
        isCurrentUser: member.userId === req.user.id,
      };
    }

    /*
     * User yang belum memiliki record AccountAccess
     * dianggap tidak memiliki akses.
     */
    return {
      id: access?.id || null,
      accountId,
      userId: member.userId,

      user: member.user,

      role: member.role,

      canView: access?.canView === true,
      canCreateTx: access?.canCreateTx === true,
      canEditTx: access?.canEditTx === true,
      canDeleteTx: access?.canDeleteTx === true,
      canManage: access?.canManage === true,

      isOwner: false,
      isCurrentUser: member.userId === req.user.id,
    };
  });

  res.json(result);
});

/*
|--------------------------------------------------------------------------
| PUT /api/accounts/:accountId/access/:userId
|
| OWNER / ADMIN
|   -> boleh mengubah permission
|
| MEMBER / VIEWER
|   -> forbidden
|--------------------------------------------------------------------------
*/

const setAccountAccess = asyncHandler(async (req, res) => {
  const { accountId, userId } = req.params;

  const tenantId = req.tenantId;
  const currentUserId = req.user.id;
  const membership = req.membership;

  /*
  |--------------------------------------------------------------------------
  | Authorization
  |--------------------------------------------------------------------------
  */

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  if (!isOwnerOrAdmin(membership)) {
    return res.status(403).json({
      message: 'Hanya Owner atau Admin yang dapat mengatur akses rekening.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Account validation
  |--------------------------------------------------------------------------
  */

  const account = await getAccount(accountId, tenantId);

  if (!account) {
    return res.status(404).json({
      message: 'Rekening tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Target user validation
  |--------------------------------------------------------------------------
  */

  const targetMembership = await getActiveMembership(
    userId,
    tenantId
  );

  if (!targetMembership) {
    return res.status(404).json({
      message: 'User bukan anggota aktif keluarga ini.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Tidak boleh mengubah permission diri sendiri
  |--------------------------------------------------------------------------
  */

  if (userId === currentUserId) {
    return res.status(400).json({
      message: 'Anda tidak dapat mengubah permission diri sendiri.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | OWNER selalu full access
  |--------------------------------------------------------------------------
  */

  if (targetMembership.role === 'OWNER') {
    return res.status(400).json({
      message: 'Permission Owner tidak dapat diubah.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validation body
  |--------------------------------------------------------------------------
  */

  const {
    canView,
    canCreateTx,
    canEditTx,
    canDeleteTx,
    canManage,
  } = req.body;

  /*
  |--------------------------------------------------------------------------
  | Normalisasi permission
  |--------------------------------------------------------------------------
  */

  const data = {
    canView: canView === true,
    canCreateTx: canCreateTx === true,
    canEditTx: canEditTx === true,
    canDeleteTx: canDeleteTx === true,
    canManage: canManage === true,
  };

  /*
  |--------------------------------------------------------------------------
  | Business Rule
  |
  | Kalau tidak bisa melihat account,
  | tidak mungkin user bisa melakukan transaksi.
  |--------------------------------------------------------------------------
  */

  if (!data.canView) {
    data.canCreateTx = false;
    data.canEditTx = false;
    data.canDeleteTx = false;
    data.canManage = false;
  }

  /*
  |--------------------------------------------------------------------------
  | Ambil data lama untuk Audit Log
  |--------------------------------------------------------------------------
  */

  const oldAccess = await prisma.accountAccess.findUnique({
    where: {
      accountId_userId: {
        accountId,
        userId,
      },
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Upsert
  |--------------------------------------------------------------------------
  */

  const updatedAccess = await prisma.accountAccess.upsert({
    where: {
      accountId_userId: {
        accountId,
        userId,
      },
    },

    create: {
      accountId,
      userId,
      ...data,
    },

    update: {
      ...data,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId,
    userId: currentUserId,
    action: 'UPDATE',
    module: 'AccountAccess',
    recordId: updatedAccess.id,

    oldValue: oldAccess,

    newValue: updatedAccess,
  });

  res.json(updatedAccess);
});

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  listAccountAccess,
  setAccountAccess,
};
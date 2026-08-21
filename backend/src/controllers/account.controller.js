const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const ACCOUNT_TYPES = [
  'BANK',
  'CASH',
  'EWALLET',
  'SAVINGS',
  'OTHER',
];

const MANAGEMENT_ROLES = [
  'OWNER',
  'ADMIN',
];

/*
|--------------------------------------------------------------------------
| ROLE HELPERS
|--------------------------------------------------------------------------
*/

const isOwner = (membership) => {
  return membership?.role === 'OWNER';
};

const isAdmin = (membership) => {
  return membership?.role === 'ADMIN';
};

const isOwnerOrAdmin = (membership) => {
  return MANAGEMENT_ROLES.includes(
    membership?.role
  );
};

/*
|--------------------------------------------------------------------------
| CONTEXT VALIDATION
|--------------------------------------------------------------------------
*/

const validateContext = (req, res) => {
  if (!req.tenantId) {
    res.status(400).json({
      message:
        'Tenant tidak ditemukan.',
    });

    return false;
  }

  if (!req.membership) {
    res.status(403).json({
      message:
        'Membership tenant tidak ditemukan.',
    });

    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| REQUIRE MANAGEMENT ACCESS
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> allowed
|
| MEMBER / VIEWER
| -> 403
|
|--------------------------------------------------------------------------
*/

const requireOwnerOrAdmin = (
  req,
  res,
  message
) => {
  if (!req.membership) {
    res.status(403).json({
      message:
        'Membership tenant tidak ditemukan.',
      code:
        'TENANT_MEMBERSHIP_REQUIRED',
    });

    return false;
  }

  if (!isOwnerOrAdmin(req.membership)) {
    res.status(403).json({
      message:
        message ||
        'Hanya Owner atau Admin yang dapat mengakses fitur ini.',
      code:
        'ACCOUNT_MANAGEMENT_ACCESS_DENIED',
    });

    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| GET ACCOUNT
|--------------------------------------------------------------------------
|
| Semua query account WAJIB berdasarkan tenant.
|
| activeOnly = true
| -> hanya account aktif
|
|--------------------------------------------------------------------------
*/

const getAccount = async (
  id,
  tenantId,
  options = {}
) => {
  const {
    activeOnly = false,
  } = options;

  return prisma.account.findFirst({
    where: {
      id,
      tenantId,

      ...(activeOnly
        ? {
            isActive: true,
          }
        : {}),
    },
  });
};

/*
|--------------------------------------------------------------------------
| GET ACCOUNT ACCESS
|--------------------------------------------------------------------------
*/

const getAccountAccess = async (
  accountId,
  userId
) => {
  return prisma.accountAccess.findUnique({
    where: {
      accountId_userId: {
        accountId,
        userId,
      },
    },
  });
};

/*
|--------------------------------------------------------------------------
| EFFECTIVE ACCOUNT ACCESS
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> full access ke account aktif
|
| MEMBER / VIEWER
| -> mengikuti AccountAccess
|
| Account inactive
| -> selalu ditolak
|
|--------------------------------------------------------------------------
*/

const getEffectiveAccountAccess = async (
  req,
  accountId
) => {
  /*
   * Account harus ACTIVE
   */

  const account = await getAccount(
    accountId,
    req.tenantId,
    {
      activeOnly: true,
    }
  );

  if (!account) {
    return {
      allowed: false,
      account: null,
      access: null,
      reason:
        'ACCOUNT_NOT_FOUND',
    };
  }

  /*
   * OWNER / ADMIN
   */

  if (
    isOwnerOrAdmin(
      req.membership
    )
  ) {
    return {
      allowed: true,

      account,

      access: {
        canView: true,
        canCreateTx: true,
        canEditTx: true,
        canDeleteTx: true,
        canManage: true,
      },
    };
  }

  /*
   * MEMBER / VIEWER
   */

  const access =
    await getAccountAccess(
      accountId,
      req.user.id
    );

  if (!access) {
    return {
      allowed: false,
      account,
      access: null,
      reason: 'NO_ACCESS',
    };
  }

  return {
    allowed:
      access.canView === true,

    account,

    access,
  };
};

/*
|--------------------------------------------------------------------------
| REQUIRE ACCOUNT PERMISSION
|--------------------------------------------------------------------------
*/

const requireAccountPermission =
  async (
    req,
    res,
    accountId,
    permission
  ) => {
    const result =
      await getEffectiveAccountAccess(
        req,
        accountId
      );

    /*
     * Account tidak ada / inactive
     */

    if (!result.account) {
      res.status(404).json({
        message:
          'Rekening tidak ditemukan atau sudah tidak aktif.',
        code:
          'ACCOUNT_NOT_FOUND_OR_INACTIVE',
      });

      return null;
    }

    /*
     * Tidak punya akses view
     */

    if (!result.allowed) {
      res.status(403).json({
        message:
          'Anda tidak memiliki akses ke rekening ini.',
        code:
          'ACCOUNT_ACCESS_DENIED',
      });

      return null;
    }

    /*
     * Tidak punya permission tertentu
     */

    if (
      result.access?.[permission] !== true
    ) {
      res.status(403).json({
        message:
          `Anda tidak memiliki izin ${permission} pada rekening ini.`,
        code:
          'ACCOUNT_PERMISSION_DENIED',
      });

      return null;
    }

    return result;
  };

/*
|--------------------------------------------------------------------------
| GET /api/accounts
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> semua account ACTIVE
|
| MEMBER / VIEWER
| -> hanya account ACTIVE
|    yang canView = true
|
| Inactive account:
| -> tidak pernah dikirim ke frontend
|
| Tidak ada account:
| -> []
|
|--------------------------------------------------------------------------
*/

const listAccounts =
  asyncHandler(async (req, res) => {
    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    const membership =
      req.membership;

    /*
     * Context
     */

    if (!tenantId) {
      return res.status(400).json({
        message:
          'Tenant tidak ditemukan.',
      });
    }

    if (!membership) {
      return res.status(403).json({
        message:
          'Membership tenant tidak ditemukan.',
      });
    }

    const ownerOrAdmin =
      isOwnerOrAdmin(
        membership
      );

    /*
     * Get active accounts
     */

    const accounts =
      await prisma.account.findMany({
        where: {
          tenantId,

          /*
           * NONACTIVE SELALU DISEMBUNYIKAN
           */

          isActive: true,

          /*
           * OWNER / ADMIN
           */

          ...(ownerOrAdmin
            ? {}

            /*
             * MEMBER / VIEWER
             */

            : {
                accesses: {
                  some: {
                    userId,
                    canView: true,
                  },
                },
              }),
        },

        orderBy: {
          createdAt: 'asc',
        },
      });

    /*
     * Empty state
     */

    if (accounts.length === 0) {
      return res.json([]);
    }

    return res.json(
      accounts
    );
  });

/*
|--------------------------------------------------------------------------
| POST /api/accounts
|--------------------------------------------------------------------------
|
| OWNER / ADMIN ONLY
|
|--------------------------------------------------------------------------
*/

const createAccount =
  asyncHandler(async (req, res) => {
    if (
      !validateContext(
        req,
        res
      )
    ) {
      return;
    }

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    /*
     * Authorization
     */

    if (
      !requireOwnerOrAdmin(
        req,
        res,
        'Hanya Owner atau Admin yang dapat membuat rekening.'
      )
    ) {
      return;
    }

    const {
      name,
      type,
      accountNumber,
      initialBalance,
      initialBalanceDate,
      description,
    } = req.body;

    /*
     * Name
     */

    const accountName =
      typeof name === 'string'
        ? name.trim()
        : '';

    if (!accountName) {
      return res.status(400).json({
        message:
          'Nama rekening wajib diisi.',
      });
    }

    /*
     * Type
     */

    if (
      !ACCOUNT_TYPES.includes(
        type
      )
    ) {
      return res.status(400).json({
        message:
          'Jenis rekening tidak valid.',
      });
    }

    /*
     * Initial balance
     */

    const balance =
      Number(
        initialBalance ?? 0
      );

    if (
      !Number.isFinite(
        balance
      )
    ) {
      return res.status(400).json({
        message:
          'Saldo awal harus berupa angka.',
      });
    }

    if (balance < 0) {
      return res.status(400).json({
        message:
          'Saldo awal tidak boleh negatif.',
      });
    }

    /*
     * Initial balance date
     */

    let parsedInitialBalanceDate =
      new Date();

    if (initialBalanceDate) {
      parsedInitialBalanceDate =
        new Date(
          initialBalanceDate
        );

      if (
        Number.isNaN(
          parsedInitialBalanceDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            'Tanggal saldo awal tidak valid.',
        });
      }
    }

    /*
     * Duplicate account name
     */

    const duplicate =
      await prisma.account.findFirst({
        where: {
          tenantId,
          name: accountName,
        },
      });

    if (duplicate) {
      return res.status(409).json({
        message:
          'Nama rekening sudah digunakan pada tenant ini.',
      });
    }

    /*
     * Create account + access creator
     */

    const result =
      await prisma.$transaction(
        async (tx) => {
          const account =
            await tx.account.create({
              data: {
                tenantId,

                name:
                  accountName,

                type,

                accountNumber:
                  typeof accountNumber ===
                  'string'
                    ? accountNumber.trim() ||
                      null
                    : null,

                initialBalance:
                  balance,

                currentBalance:
                  balance,

                initialBalanceDate:
                  parsedInitialBalanceDate,

                description:
                  typeof description ===
                  'string'
                    ? description.trim() ||
                      null
                    : null,

                isActive: true,
              },
            });

          /*
           * Creator mendapat full access.
           */

          await tx.accountAccess.create({
            data: {
              accountId:
                account.id,

              userId,

              canView: true,

              canCreateTx: true,

              canEditTx: true,

              canDeleteTx: true,

              canManage: true,
            },
          });

          return account;
        }
      );

    /*
     * Audit
     */

    await writeAudit({
      tenantId,

      userId,

      action: 'CREATE',

      module: 'Account',

      recordId:
        result.id,

      newValue:
        result,
    });

    return res.status(201).json(
      result
    );
  });

/*
|--------------------------------------------------------------------------
| PATCH /api/accounts/:id
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> full access
|
| MEMBER / VIEWER
| -> canManage = true
|
| Account harus ada dalam tenant.
|
|--------------------------------------------------------------------------
*/

const updateAccount =
  asyncHandler(async (req, res) => {
    if (
      !validateContext(
        req,
        res
      )
    ) {
      return;
    }

    const {
      id,
    } = req.params;

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    /*
     * Get account
     */

    const account =
      await getAccount(
        id,
        tenantId
      );

    if (!account) {
      return res.status(404).json({
        message:
          'Rekening tidak ditemukan.',
      });
    }

    /*
     * Authorization
     *
     * OWNER / ADMIN
     * -> full
     *
     * MEMBER / VIEWER
     * -> canManage
     */

    if (
      !isOwnerOrAdmin(
        req.membership
      )
    ) {
      const access =
        await getAccountAccess(
          id,
          userId
        );

      if (
        access?.canManage !== true
      ) {
        return res.status(403).json({
          message:
            'Anda tidak memiliki izin untuk mengelola rekening ini.',
          code:
            'ACCOUNT_MANAGE_DENIED',
        });
      }
    }

    const {
      name,
      accountNumber,
      description,
      isActive,
    } = req.body;

    /*
     * Name validation
     */

    let newName;

    if (
      name !== undefined
    ) {
      if (
        typeof name !==
        'string'
      ) {
        return res.status(400).json({
          message:
            'Nama rekening harus berupa teks.',
        });
      }

      newName =
        name.trim();

      if (!newName) {
        return res.status(400).json({
          message:
            'Nama rekening tidak boleh kosong.',
        });
      }
    }

    /*
     * Duplicate name
     */

    if (
      newName !== undefined &&
      newName !== account.name
    ) {
      const duplicate =
        await prisma.account.findFirst({
          where: {
            tenantId,

            name:
              newName,

            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        return res.status(409).json({
          message:
            'Nama rekening sudah digunakan pada tenant ini.',
        });
      }
    }

    /*
     * isActive validation
     */

    if (
      isActive !==
        undefined &&
      typeof isActive !==
        'boolean'
    ) {
      return res.status(400).json({
        message:
          'isActive harus berupa boolean.',
      });
    }

    /*
     * Update
     */

    const updated =
      await prisma.account.update({
        where: {
          id,
        },

        data: {
          ...(newName !==
            undefined && {
            name:
              newName,
          }),

          ...(accountNumber !==
            undefined && {
            accountNumber:
              typeof accountNumber ===
              'string'
                ? accountNumber.trim() ||
                  null
                : null,
          }),

          ...(description !==
            undefined && {
            description:
              typeof description ===
              'string'
                ? description.trim() ||
                  null
                : null,
          }),

          ...(isActive !==
            undefined && {
            isActive,
          }),
        },
      });

    /*
     * Audit
     */

    await writeAudit({
      tenantId,

      userId,

      action: 'UPDATE',

      module: 'Account',

      recordId:
        id,

      oldValue:
        account,

      newValue:
        updated,
    });

    return res.json(
      updated
    );
  });

/*
|--------------------------------------------------------------------------
| DELETE /api/accounts/:id
|--------------------------------------------------------------------------
|
| Soft Delete / Deactivate
|
| OWNER / ADMIN
| -> boleh
|
| MEMBER / VIEWER
| -> canManage = true
|
|--------------------------------------------------------------------------
*/

const deactivateAccount =
  asyncHandler(async (req, res) => {
    if (
      !validateContext(
        req,
        res
      )
    ) {
      return;
    }

    const {
      id,
    } = req.params;

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    /*
     * Get account
     */

    const account =
      await getAccount(
        id,
        tenantId
      );

    if (!account) {
      return res.status(404).json({
        message:
          'Rekening tidak ditemukan.',
      });
    }

    /*
     * Already inactive
     */

    if (!account.isActive) {
      return res.status(400).json({
        message:
          'Rekening sudah tidak aktif.',
      });
    }

    /*
     * Authorization
     */

    if (
      !isOwnerOrAdmin(
        req.membership
      )
    ) {
      const access =
        await getAccountAccess(
          id,
          userId
        );

      if (
        access?.canManage !== true
      ) {
        return res.status(403).json({
          message:
            'Anda tidak memiliki izin untuk menonaktifkan rekening ini.',
          code:
            'ACCOUNT_MANAGE_DENIED',
        });
      }
    }

    /*
     * Deactivate
     */

    const updated =
      await prisma.account.update({
        where: {
          id,
        },

        data: {
          isActive: false,
        },
      });

    /*
     * Audit
     */

    await writeAudit({
      tenantId,

      userId,

      action: 'DELETE',

      module: 'Account',

      recordId:
        id,

      oldValue:
        account,

      newValue:
        updated,
    });

    return res.json(
      updated
    );
  });

/*
|--------------------------------------------------------------------------
| GET /api/accounts/:id/access
|--------------------------------------------------------------------------
|
| OWNER / ADMIN ONLY
|
| Account inactive tetap dapat ditemukan
| untuk kebutuhan management access.
|
|--------------------------------------------------------------------------
*/

const getAccountAccessList =
  asyncHandler(async (req, res) => {
    if (
      !validateContext(
        req,
        res
      )
    ) {
      return;
    }

    const {
      id,
    } = req.params;

    const tenantId =
      req.tenantId;

    const currentUserId =
      req.user.id;

    /*
     * Authorization
     */

    if (
      !requireOwnerOrAdmin(
        req,
        res,
        'Hanya Owner atau Admin yang dapat mengelola akses rekening.'
      )
    ) {
      return;
    }

    /*
     * Account
     */

    const account =
      await getAccount(
        id,
        tenantId
      );

    if (!account) {
      return res.status(404).json({
        message:
          'Rekening tidak ditemukan.',
      });
    }

    /*
     * Active memberships
     */

    const memberships =
      await prisma.membership.findMany({
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

    /*
     * Account accesses
     */

    const accesses =
      await prisma.accountAccess.findMany({
        where: {
          accountId:
            id,
        },
      });

    /*
     * Access map
     */

    const accessMap =
      new Map();

    for (
      const access of
      accesses
    ) {
      accessMap.set(
        access.userId,
        access
      );
    }

    /*
     * Merge membership + access
     */

    const result =
      memberships.map(
        (member) => {
          const access =
            accessMap.get(
              member.userId
            );

          /*
           * OWNER
           *
           * Always full access.
           */

          if (
            member.role ===
            'OWNER'
          ) {
            return {
              id:
                access?.id ||
                null,

              accountId:
                id,

              userId:
                member.userId,

              user:
                member.user,

              role:
                member.role,

              canView: true,

              canCreateTx: true,

              canEditTx: true,

              canDeleteTx: true,

              canManage: true,

              isOwner: true,

              isCurrentUser:
                member.userId ===
                currentUserId,
            };
          }

          /*
           * ADMIN / MEMBER / VIEWER
           */

          return {
            id:
              access?.id ||
              null,

            accountId:
              id,

            userId:
              member.userId,

            user:
              member.user,

            role:
              member.role,

            canView:
              access?.canView ===
              true,

            canCreateTx:
              access?.canCreateTx ===
              true,

            canEditTx:
              access?.canEditTx ===
              true,

            canDeleteTx:
              access?.canDeleteTx ===
              true,

            canManage:
              access?.canManage ===
              true,

            isOwner: false,

            isCurrentUser:
              member.userId ===
              currentUserId,
          };
        }
      );

    return res.json(
      result
    );
  });

/*
|--------------------------------------------------------------------------
| PUT /api/accounts/:id/access/:userId
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh mengubah access
|
| OWNER
| -> tidak dapat diubah
|
| Current User
| -> tidak dapat mengubah dirinya sendiri
|
| ADMIN
| -> hanya dapat mengubah MEMBER / VIEWER
|
| OWNER
| -> dapat mengubah ADMIN / MEMBER / VIEWER
|
|--------------------------------------------------------------------------
*/

const updateAccountAccess =
  asyncHandler(async (req, res) => {
    if (
      !validateContext(
        req,
        res
      )
    ) {
      return;
    }

    const {
      id,
      userId,
    } = req.params;

    const tenantId =
      req.tenantId;

    const currentUserId =
      req.user.id;

    /*
     * Authorization
     */

    if (
      !requireOwnerOrAdmin(
        req,
        res,
        'Hanya Owner atau Admin yang dapat mengubah akses rekening.'
      )
    ) {
      return;
    }

    /*
     * Account
     */

    const account =
      await getAccount(
        id,
        tenantId
      );

    if (!account) {
      return res.status(404).json({
        message:
          'Rekening tidak ditemukan.',
      });
    }

    /*
     * Target membership
     */

    const targetMembership =
      await prisma.membership.findFirst({
        where: {
          tenantId,

          userId,

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

    if (!targetMembership) {
      return res.status(404).json({
        message:
          'User bukan anggota aktif tenant ini.',
      });
    }

    /*
     * Cannot modify own permission
     */

    if (
      userId ===
      currentUserId
    ) {
      return res.status(400).json({
        message:
          'Anda tidak dapat mengubah permission diri sendiri.',
      });
    }

    /*
     * OWNER cannot be modified
     */

    if (
      targetMembership.role ===
      'OWNER'
    ) {
      return res.status(400).json({
        message:
          'Permission Owner tidak dapat diubah.',
      });
    }

    /*
     * ADMIN cannot modify another ADMIN
     */

    if (
      isAdmin(req.membership) &&
      targetMembership.role ===
        'ADMIN'
    ) {
      return res.status(403).json({
        message:
          'Admin tidak dapat mengubah permission Admin lain.',
        code:
          'ADMIN_ACCESS_MANAGEMENT_DENIED',
      });
    }

    /*
     * Permission input
     */

    const {
      canView,
      canCreateTx,
      canEditTx,
      canDeleteTx,
      canManage,
    } = req.body;

    /*
     * Normalize
     */

    const accessData = {
      canView:
        canView === true,

      canCreateTx:
        canCreateTx === true,

      canEditTx:
        canEditTx === true,

      canDeleteTx:
        canDeleteTx === true,

      canManage:
        canManage === true,
    };

    /*
     * Business rule:
     *
     * Kalau tidak bisa view,
     * permission lain otomatis false.
     */

    if (
      !accessData.canView
    ) {
      accessData.canCreateTx =
        false;

      accessData.canEditTx =
        false;

      accessData.canDeleteTx =
        false;

      accessData.canManage =
        false;
    }

    /*
     * Existing access
     */

    const oldAccess =
      await prisma.accountAccess.findUnique({
        where: {
          accountId_userId: {
            accountId:
              id,

            userId,
          },
        },
      });

    /*
     * Upsert
     */

    const updatedAccess =
      await prisma.accountAccess.upsert({
        where: {
          accountId_userId: {
            accountId:
              id,

            userId,
          },
        },

        create: {
          accountId:
            id,

          userId,

          ...accessData,
        },

        update: {
          ...accessData,
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
     * Audit
     */

    await writeAudit({
      tenantId,

      userId:
        currentUserId,

      action:
        'UPDATE',

      module:
        'AccountAccess',

      recordId:
        updatedAccess.id,

      oldValue:
        oldAccess,

      newValue:
        updatedAccess,
    });

    /*
     * Response
     */

    return res.json({
      ...updatedAccess,

      role:
        targetMembership.role,

      isOwner:
        targetMembership.role ===
        'OWNER',

      isCurrentUser:
        userId ===
        currentUserId,
    });
  });

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  listAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
  getAccountAccessList,
  updateAccountAccess,
};
const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'];

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'];

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(
    membership?.role
  );
};

const isViewer = (membership) => {
  return membership?.role === 'VIEWER';
};

const isMember = (membership) => {
  return membership?.role === 'MEMBER';
};

/*
|--------------------------------------------------------------------------
| HELPER: VALIDATE TENANT
|--------------------------------------------------------------------------
*/

const requireTenant = (req, res) => {
  if (!req.tenantId) {
    res.status(400).json({
      message: 'Tenant tidak ditemukan.',
    });

    return false;
  }

  if (!req.user?.id) {
    res.status(401).json({
      message: 'User tidak terautentikasi.',
    });

    return false;
  }

  if (!req.membership?.role) {
    res.status(403).json({
      message: 'Membership user tidak ditemukan.',
    });

    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| HELPER: GET ACCOUNT
|--------------------------------------------------------------------------
*/

const getAccount = async (
  accountId,
  tenantId
) => {
  return prisma.account.findFirst({
    where: {
      id: accountId,
      tenantId,
      isActive: true,
    },
  });
};

/*
|--------------------------------------------------------------------------
| HELPER: GET ACCOUNT PERMISSION
|--------------------------------------------------------------------------
|
| OWNER
| ADMIN
| -> full access semua account tenant
|
| MEMBER
| -> berdasarkan AccountAccess
|
| VIEWER
| -> hanya read
| -> tidak boleh create/edit/delete transaction
|
|--------------------------------------------------------------------------
*/

const getAccountPermission = async (
  req,
  accountId
) => {
  const {
    tenantId,
    user,
    membership,
  } = req;

  if (!accountId) {
    return {
      allowed: false,
      account: null,
      access: null,
      reason: 'ACCOUNT_ID_REQUIRED',
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Pastikan account benar-benar milik tenant
  |--------------------------------------------------------------------------
  */

  const account = await getAccount(
    accountId,
    tenantId
  );

  if (!account) {
    return {
      allowed: false,
      account: null,
      access: null,
      reason: 'ACCOUNT_NOT_FOUND',
    };
  }

  /*
  |--------------------------------------------------------------------------
  | OWNER / ADMIN
  |--------------------------------------------------------------------------
  */

  if (isOwnerOrAdmin(membership)) {
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
  |--------------------------------------------------------------------------
  | Ambil AccountAccess
  |--------------------------------------------------------------------------
  |
  | Sekaligus pastikan account masih berada
  | di tenant yang sedang aktif.
  |
  */

  const access =
    await prisma.accountAccess.findFirst({
      where: {
        accountId,
        userId: user.id,

        account: {
          tenantId,
          isActive: true,
        },
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Tidak ada access
  |--------------------------------------------------------------------------
  */

  if (!access) {
    return {
      allowed: false,
      account,
      access: null,
      reason: 'NO_ACCESS',
    };
  }

  /*
  |--------------------------------------------------------------------------
  | VIEWER
  |--------------------------------------------------------------------------
  |
  | Viewer tetap boleh membaca account jika
  | canView = true.
  |
  | Tapi permission write akan dipaksa false
  | walaupun data AccountAccess salah/terlanjur true.
  |
  */

  if (isViewer(membership)) {
    return {
      allowed:
        access.canView === true,

      account,

      access: {
        ...access,

        canCreateTx: false,
        canEditTx: false,
        canDeleteTx: false,
        canManage: false,
      },
    };
  }

  /*
  |--------------------------------------------------------------------------
  | MEMBER
  |--------------------------------------------------------------------------
  */

  if (isMember(membership)) {
    return {
      allowed:
        access.canView === true,

      account,

      access,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Role tidak dikenal
  |--------------------------------------------------------------------------
  */

  return {
    allowed: false,
    account,
    access,
    reason: 'INVALID_ROLE',
  };
};

/*
|--------------------------------------------------------------------------
| HELPER: REQUIRE ACCOUNT PERMISSION
|--------------------------------------------------------------------------
*/

const requireAccountPermission = async (
  req,
  res,
  accountId,
  permission
) => {
  const result =
    await getAccountPermission(
      req,
      accountId
    );

  /*
  |--------------------------------------------------------------------------
  | Account tidak ditemukan
  |--------------------------------------------------------------------------
  */

  if (!result.account) {
    res.status(404).json({
      message:
        'Rekening tidak ditemukan atau sudah tidak aktif.',
    });

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Tidak punya akses view
  |--------------------------------------------------------------------------
  */

  if (!result.allowed) {
    res.status(403).json({
      message:
        'Anda tidak memiliki akses ke rekening ini.',
    });

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Permission
  |--------------------------------------------------------------------------
  */

  if (
    result.access?.[permission] !== true
  ) {
    res.status(403).json({
      message:
        `Anda tidak memiliki izin ${permission} pada rekening ini.`,
    });

    return null;
  }

  return result;
};

/*
|--------------------------------------------------------------------------
| HELPER: DATE FILTER
|--------------------------------------------------------------------------
*/

const buildDateFilter = (
  startDate,
  endDate
) => {
  const date = {};

  if (startDate) {
    const start = new Date(
      startDate
    );

    if (
      Number.isNaN(
        start.getTime()
      )
    ) {
      throw new Error(
        'startDate tidak valid.'
      );
    }

    start.setHours(
      0,
      0,
      0,
      0
    );

    date.gte = start;
  }

  if (endDate) {
    const end = new Date(
      endDate
    );

    if (
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new Error(
        'endDate tidak valid.'
      );
    }

    end.setHours(
      23,
      59,
      59,
      999
    );

    date.lte = end;
  }

  return Object.keys(date)
    .length > 0
    ? {
        date,
      }
    : {};
};

/*
|--------------------------------------------------------------------------
| GET /api/transactions
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> semua transaksi tenant
|
| MEMBER
| -> hanya transaksi account dengan canView
|
| VIEWER
| -> hanya transaksi account dengan canView
|
|--------------------------------------------------------------------------
*/

const listTransactions =
  asyncHandler(async (req, res) => {
    if (
      !requireTenant(
        req,
        res
      )
    ) {
      return;
    }

    const {
      startDate,
      endDate,
      type,
      categoryId,
      accountId,
      page = 1,
      pageSize = 20,
    } = req.query;

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(pageSize) || 20,
          1
        ),
        100
      );

    /*
    |--------------------------------------------------------------------------
    | TYPE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      type &&
      !TRANSACTION_TYPES.includes(
        type
      )
    ) {
      return res.status(400).json({
        message:
          'Jenis transaksi tidak valid.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACCOUNT FILTER
    |--------------------------------------------------------------------------
    */

    let accountWhere = {};

    /*
    |--------------------------------------------------------------------------
    | Jika accountId dikirim
    |--------------------------------------------------------------------------
    */

    if (accountId) {
      const permission =
        await getAccountPermission(
          req,
          accountId
        );

      if (!permission.account) {
        return res.status(404).json({
          message:
            'Rekening tidak ditemukan atau sudah tidak aktif.',
        });
      }

      /*
      * Semua role harus punya canView
      */

      if (
        !permission.allowed ||
        permission.access?.canView !== true
      ) {
        return res.status(403).json({
          message:
            'Anda tidak memiliki akses melihat rekening ini.',
        });
      }

      accountWhere = {
        accountId,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | OWNER / ADMIN tanpa accountId
    |--------------------------------------------------------------------------
    */

    else if (
      isOwnerOrAdmin(
        req.membership
      )
    ) {
      /*
      * Tidak perlu account filter.
      * Owner/Admin boleh melihat semua account tenant.
      */
      accountWhere = {};
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBER / VIEWER tanpa accountId
    |--------------------------------------------------------------------------
    */

    else {
      const allowedAccounts =
        await prisma.accountAccess.findMany({
          where: {
            userId,

            canView: true,

            account: {
              tenantId,
              isActive: true,
            },
          },

          select: {
            accountId: true,
          },
        });

      const accountIds =
        allowedAccounts.map(
          (item) =>
            item.accountId
        );

      /*
      |--------------------------------------------------------------------------
      | Tidak punya account access
      |--------------------------------------------------------------------------
      */

      if (
        accountIds.length === 0
      ) {
        return res.json({
          items: [],
          total: 0,
          page: currentPage,
          pageSize: limit,
          totalPages: 0,
        });
      }

      accountWhere = {
        accountId: {
          in: accountIds,
        },
      };
    }

    /*
    |--------------------------------------------------------------------------
    | DATE FILTER
    |--------------------------------------------------------------------------
    */

    let dateWhere = {};

    try {
      dateWhere =
        buildDateFilter(
          startDate,
          endDate
        );
    } catch (error) {
      return res.status(400).json({
        message:
          error.message,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MAIN WHERE
    |--------------------------------------------------------------------------
    */

    const where = {
      tenantId,

      ...accountWhere,

      ...dateWhere,

      ...(type && {
        type,
      }),

      ...(categoryId && {
        categoryId,
      }),
    };

    /*
    |--------------------------------------------------------------------------
    | QUERY
    |--------------------------------------------------------------------------
    */

    const [
      items,
      total,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where,

        include: {
          category: true,

          account: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },

        orderBy: [
          {
            date: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],

        skip:
          (currentPage - 1) *
          limit,

        take: limit,
      }),

      prisma.transaction.count({
        where,
      }),
    ]);

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    res.json({
      items,

      total,

      page: currentPage,

      pageSize: limit,

      totalPages:
        Math.ceil(
          total / limit
        ),
    });
  });

/*
|--------------------------------------------------------------------------
| POST /api/transactions/income
|--------------------------------------------------------------------------
*/

const createIncome =
  asyncHandler(async (req, res) => {
    if (
      !requireTenant(
        req,
        res
      )
    ) {
      return;
    }

    const {
      accountId,
      categoryId,
      amount,
      date,
      note,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Basic validation
    |--------------------------------------------------------------------------
    */

    if (!accountId) {
      return res.status(400).json({
        message:
          'Rekening wajib dipilih.',
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        message:
          'Nominal harus lebih besar dari 0.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VIEWER
    |--------------------------------------------------------------------------
    */

    if (
      isViewer(
        req.membership
      )
    ) {
      return res.status(403).json({
        message:
          'Viewer hanya memiliki akses melihat transaksi.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACCOUNT PERMISSION
    |--------------------------------------------------------------------------
    */

    const permission =
      await requireAccountPermission(
        req,
        res,
        accountId,
        'canCreateTx'
      );

    if (!permission) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    if (categoryId) {
      const category =
        await prisma.category.findFirst({
          where: {
            id: categoryId,
            tenantId:
              req.tenantId,
            type: 'INCOME',
            isActive: true,
          },
        });

      if (!category) {
        return res.status(400).json({
          message:
            'Kategori pemasukan tidak valid.',
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DATE
    |--------------------------------------------------------------------------
    */

    const transactionDate =
      date
        ? new Date(date)
        : new Date();

    if (
      Number.isNaN(
        transactionDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          'Tanggal transaksi tidak valid.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE TRANSACTION
    |--------------------------------------------------------------------------
    */

    const transaction =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.transaction.create({
              data: {
                tenantId:
                  req.tenantId,

                userId:
                  req.user.id,

                accountId,

                categoryId:
                  categoryId ||
                  null,

                type: 'INCOME',

                amount:
                  numericAmount,

                date:
                  transactionDate,

                note:
                  typeof note ===
                  'string'
                    ? note.trim() ||
                      null
                    : null,
              },

              include: {
                account: true,
                category: true,
              },
            });

          await tx.account.update({
            where: {
              id: accountId,
            },

            data: {
              currentBalance: {
                increment:
                  numericAmount,
              },
            },
          });

          return created;
        }
      );

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await writeAudit({
      tenantId:
        req.tenantId,

      userId:
        req.user.id,

      action: 'CREATE',

      module:
        'Transaction',

      recordId:
        transaction.id,

      newValue:
        transaction,
    });

    res.status(201).json(
      transaction
    );
  });

/*
|--------------------------------------------------------------------------
| POST /api/transactions/expense
|--------------------------------------------------------------------------
|
| Frontend mendukung:
|
| LOW_BALANCE_WARNING
|
| Jika saldo kurang:
| -> return 409
| -> code LOW_BALANCE_WARNING
|
| Jika frontend kirim:
| confirmLowBalance: true
|
| -> transaksi tetap diproses.
|
|--------------------------------------------------------------------------
*/

const createExpense =
  asyncHandler(async (req, res) => {
    if (
      !requireTenant(
        req,
        res
      )
    ) {
      return;
    }

    const {
      accountId,
      categoryId,
      amount,
      date,
      note,
      confirmLowBalance = false,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Basic validation
    |--------------------------------------------------------------------------
    */

    if (!accountId) {
      return res.status(400).json({
        message:
          'Rekening wajib dipilih.',
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        message:
          'Nominal harus lebih besar dari 0.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VIEWER
    |--------------------------------------------------------------------------
    */

    if (
      isViewer(
        req.membership
      )
    ) {
      return res.status(403).json({
        message:
          'Viewer hanya memiliki akses melihat transaksi.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACCOUNT PERMISSION
    |--------------------------------------------------------------------------
    */

    const permission =
      await requireAccountPermission(
        req,
        res,
        accountId,
        'canCreateTx'
      );

    if (!permission) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    if (categoryId) {
      const category =
        await prisma.category.findFirst({
          where: {
            id: categoryId,
            tenantId:
              req.tenantId,
            type: 'EXPENSE',
            isActive: true,
          },
        });

      if (!category) {
        return res.status(400).json({
          message:
            'Kategori pengeluaran tidak valid.',
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | LOW BALANCE WARNING
    |--------------------------------------------------------------------------
    |
    | Jangan langsung menolak.
    | Frontend akan membuka confirm modal kedua.
    |
    */

    const currentBalance =
      Number(
        permission.account
          .currentBalance || 0
      );

    if (
      currentBalance <
        numericAmount &&
      confirmLowBalance !== true
    ) {
      return res.status(409).json({
        code:
          'LOW_BALANCE_WARNING',

        message:
          `Saldo rekening saat ini ${currentBalance.toLocaleString(
            'id-ID'
          )} dan nominal pengeluaran ${numericAmount.toLocaleString(
            'id-ID'
          )}. Saldo akan menjadi negatif. Apakah Anda tetap ingin menyimpan transaksi ini?`,

        currentBalance,

        amount:
          numericAmount,

        resultingBalance:
          currentBalance -
          numericAmount,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DATE
    |--------------------------------------------------------------------------
    */

    const transactionDate =
      date
        ? new Date(date)
        : new Date();

    if (
      Number.isNaN(
        transactionDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          'Tanggal transaksi tidak valid.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE + UPDATE BALANCE
    |--------------------------------------------------------------------------
    */

    const transaction =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.transaction.create({
              data: {
                tenantId:
                  req.tenantId,

                userId:
                  req.user.id,

                accountId,

                categoryId:
                  categoryId ||
                  null,

                type: 'EXPENSE',

                amount:
                  numericAmount,

                date:
                  transactionDate,

                note:
                  typeof note ===
                  'string'
                    ? note.trim() ||
                      null
                    : null,
              },

              include: {
                account: true,
                category: true,
              },
            });

          await tx.account.update({
            where: {
              id: accountId,
            },

            data: {
              currentBalance: {
                decrement:
                  numericAmount,
              },
            },
          });

          return created;
        }
      );

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await writeAudit({
      tenantId:
        req.tenantId,

      userId:
        req.user.id,

      action: 'CREATE',

      module:
        'Transaction',

      recordId:
        transaction.id,

      newValue:
        transaction,
    });

    res.status(201).json(
      transaction
    );
  });

/*
|--------------------------------------------------------------------------
| POST /api/transactions/transfer
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> full access
|
| MEMBER
| -> wajib canView + canCreateTx
|    pada rekening asal DAN tujuan
|
| VIEWER
| -> tidak boleh
|
|--------------------------------------------------------------------------
*/

const createTransfer =
  asyncHandler(async (req, res) => {
    if (
      !requireTenant(
        req,
        res
      )
    ) {
      return;
    }

    const {
      sourceAccountId,
      destinationAccountId,
      fromAccountId,
      toAccountId,
      amount,
      date,
      note,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Support old + new frontend field
    |--------------------------------------------------------------------------
    */

    const sourceId =
      sourceAccountId ||
      fromAccountId;

    const destinationId =
      destinationAccountId ||
      toAccountId;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (
      !sourceId ||
      !destinationId
    ) {
      return res.status(400).json({
        message:
          'Rekening asal dan tujuan wajib dipilih.',
      });
    }

    if (
      String(sourceId) ===
      String(destinationId)
    ) {
      return res.status(400).json({
        message:
          'Rekening asal dan tujuan tidak boleh sama.',
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        message:
          'Nominal transfer harus lebih besar dari 0.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | VIEWER
    |--------------------------------------------------------------------------
    */

    if (
      isViewer(
        req.membership
      )
    ) {
      return res.status(403).json({
        message:
          'Viewer hanya memiliki akses melihat transaksi.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SOURCE ACCOUNT
    |--------------------------------------------------------------------------
    */

    const sourcePermission =
      await requireAccountPermission(
        req,
        res,
        sourceId,
        'canCreateTx'
      );

    if (!sourcePermission) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | DESTINATION ACCOUNT
    |--------------------------------------------------------------------------
    */

    const destinationPermission =
      await requireAccountPermission(
        req,
        res,
        destinationId,
        'canCreateTx'
      );

    if (!destinationPermission) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | EXTRA VIEW CHECK
    |--------------------------------------------------------------------------
    |
    | Transfer membutuhkan canView pada kedua account.
    |
    */

    if (
      sourcePermission.access
        ?.canView !== true ||
      destinationPermission.access
        ?.canView !== true
    ) {
      return res.status(403).json({
        message:
          'Anda harus memiliki akses melihat kedua rekening untuk melakukan transfer.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | BALANCE
    |--------------------------------------------------------------------------
    */

    const sourceBalance =
      Number(
        sourcePermission.account
          .currentBalance || 0
      );

    if (
      sourceBalance <
      numericAmount
    ) {
      return res.status(400).json({
        message:
          'Saldo rekening asal tidak mencukupi.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DATE
    |--------------------------------------------------------------------------
    */

    const transactionDate =
      date
        ? new Date(date)
        : new Date();

    if (
      Number.isNaN(
        transactionDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          'Tanggal transfer tidak valid.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFER GROUP ID
    |--------------------------------------------------------------------------
    */

    const transferGroupId =
      `TRF-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const transferNote =
      typeof note === 'string'
        ? note.trim()
        : '';

    /*
    |--------------------------------------------------------------------------
    | CREATE TRANSFER
    |--------------------------------------------------------------------------
    */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
          * OUT
          */

          const transferOut =
            await tx.transaction.create({
              data: {
                tenantId:
                  req.tenantId,

                userId:
                  req.user.id,

                accountId:
                  sourceId,

                type: 'EXPENSE',

                amount:
                  numericAmount,

                date:
                  transactionDate,

                note:
                  transferNote
                    ? `${transferNote} [TRANSFER:${transferGroupId}]`
                    : `[TRANSFER:${transferGroupId}]`,
              },

              include: {
                account: true,
              },
            });

          /*
          * IN
          */

          const transferIn =
            await tx.transaction.create({
              data: {
                tenantId:
                  req.tenantId,

                userId:
                  req.user.id,

                accountId:
                  destinationId,

                type: 'INCOME',

                amount:
                  numericAmount,

                date:
                  transactionDate,

                note:
                  transferNote
                    ? `${transferNote} [TRANSFER:${transferGroupId}]`
                    : `[TRANSFER:${transferGroupId}]`,
              },

              include: {
                account: true,
              },
            });

          /*
          * Kurangi source
          */

          await tx.account.update({
            where: {
              id: sourceId,
            },

            data: {
              currentBalance: {
                decrement:
                  numericAmount,
              },
            },
          });

          /*
          * Tambah destination
          */

          await tx.account.update({
            where: {
              id: destinationId,
            },

            data: {
              currentBalance: {
                increment:
                  numericAmount,
              },
            },
          });

          return {
            transferGroupId,

            transferOut,

            transferIn,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await writeAudit({
      tenantId:
        req.tenantId,

      userId:
        req.user.id,

      action: 'CREATE',

      module:
        'Transfer',

      recordId:
        result.transferGroupId,

      newValue:
        result,
    });

    res.status(201).json(
      result
    );
  });

/*
|--------------------------------------------------------------------------
| DELETE /api/transactions/transfer/:transferGroupId
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh
|
| MEMBER
| -> wajib canView + canDeleteTx
|    pada kedua rekening
|
| VIEWER
| -> tidak boleh
|
|--------------------------------------------------------------------------
*/

const cancelTransfer =
  asyncHandler(async (req, res) => {
    if (
      !requireTenant(
        req,
        res
      )
    ) {
      return;
    }

    const {
      transferGroupId,
    } = req.params;

    /*
    |--------------------------------------------------------------------------
    | VIEWER
    |--------------------------------------------------------------------------
    */

    if (
      isViewer(
        req.membership
      )
    ) {
      return res.status(403).json({
        message:
          'Viewer tidak memiliki izin membatalkan transfer.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Transfer ID
    |--------------------------------------------------------------------------
    */

    if (!transferGroupId) {
      return res.status(400).json({
        message:
          'Transfer ID wajib diisi.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Cari transaksi transfer
    |--------------------------------------------------------------------------
    */

    const transactions =
      await prisma.transaction.findMany({
        where: {
          tenantId:
            req.tenantId,

          note: {
            contains:
              `[TRANSFER:${transferGroupId}]`,
          },
        },

        include: {
          account: true,
        },

        orderBy: {
          date: 'asc',
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Harus tepat dua transaksi
    |--------------------------------------------------------------------------
    */

    if (
      transactions.length !== 2
    ) {
      return res.status(404).json({
        message:
          'Transfer tidak ditemukan atau data transfer tidak lengkap.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validasi pasangan transfer
    |--------------------------------------------------------------------------
    */

    const expenseTransactions =
      transactions.filter(
        (item) =>
          item.type ===
          'EXPENSE'
      );

    const incomeTransactions =
      transactions.filter(
        (item) =>
          item.type ===
          'INCOME'
      );

    if (
      expenseTransactions.length !==
        1 ||
      incomeTransactions.length !==
        1
    ) {
      return res.status(400).json({
        message:
          'Struktur data transfer tidak valid.',
      });
    }

    const transferOut =
      expenseTransactions[0];

    const transferIn =
      incomeTransactions[0];

    /*
    |--------------------------------------------------------------------------
    | Amount harus sama
    |--------------------------------------------------------------------------
    */

    if (
      Number(
        transferOut.amount
      ) !==
      Number(
        transferIn.amount
      )
    ) {
      return res.status(400).json({
        message:
          'Nominal transaksi transfer tidak konsisten.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Permission SOURCE
    |--------------------------------------------------------------------------
    */

    const sourcePermission =
      await requireAccountPermission(
        req,
        res,
        transferOut.accountId,
        'canDeleteTx'
      );

    if (!sourcePermission) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Permission DESTINATION
    |--------------------------------------------------------------------------
    */

    const destinationPermission =
      await requireAccountPermission(
        req,
        res,
        transferIn.accountId,
        'canDeleteTx'
      );

    if (!destinationPermission) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | VIEW ACCESS kedua account
    |--------------------------------------------------------------------------
    */

    if (
      sourcePermission.access
        ?.canView !== true ||
      destinationPermission.access
        ?.canView !== true
    ) {
      return res.status(403).json({
        message:
          'Anda harus memiliki akses ke kedua rekening transfer.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Restore balance + delete
    |--------------------------------------------------------------------------
    */

    await prisma.$transaction(
      async (tx) => {
        /*
        * EXPENSE transfer OUT
        * -> saldo source dikembalikan
        */

        await tx.account.update({
          where: {
            id:
              transferOut.accountId,
          },

          data: {
            currentBalance: {
              increment:
                Number(
                  transferOut.amount
                ),
            },
          },
        });

        /*
        * INCOME transfer IN
        * -> saldo destination dikurangi
        */

        await tx.account.update({
          where: {
            id:
              transferIn.accountId,
          },

          data: {
            currentBalance: {
              decrement:
                Number(
                  transferIn.amount
                ),
            },
          },
        });

        /*
        * Hapus kedua transaksi
        */

        await tx.transaction.deleteMany({
          where: {
            id: {
              in: transactions.map(
                (transaction) =>
                  transaction.id
              ),
            },
          },
        });
      }
    );

    /*
    |--------------------------------------------------------------------------
    | AUDIT
    |--------------------------------------------------------------------------
    */

    await writeAudit({
      tenantId:
        req.tenantId,

      userId:
        req.user.id,

      action: 'DELETE',

      module:
        'Transfer',

      recordId:
        transferGroupId,

      oldValue:
        transactions,
    });

    res.json({
      message:
        'Transfer berhasil dibatalkan.',

      transferGroupId,
    });
  });

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  createIncome,
  createExpense,
  createTransfer,
  cancelTransfer,
  listTransactions,

  /*
   * Export helper kalau controller lain
   * membutuhkan permission account.
   */
  getAccountPermission,
  requireAccountPermission,
};
const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const MANAGEMENT_ROLES = ['OWNER', 'ADMIN'];

/*
|--------------------------------------------------------------------------
| ROLE HELPERS
|--------------------------------------------------------------------------
*/

const isOwnerOrAdmin = (membership) => {
  return MANAGEMENT_ROLES.includes(membership?.role);
};

/*
|--------------------------------------------------------------------------
| AUTHORIZATION
|--------------------------------------------------------------------------
|
| Budget hanya dapat diakses oleh:
|
| OWNER
| ADMIN
|
| MEMBER / VIEWER
| -> 403
|
| Frontend dapat menggunakan response 403 ini
| untuk langsung memblokir halaman Budget.
|
|--------------------------------------------------------------------------
*/

const requireBudgetAccess = (req, res) => {
  /*
   * Membership tidak ditemukan
   */

  if (!req.membership) {
    res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
      code: 'TENANT_MEMBERSHIP_REQUIRED',
    });

    return false;
  }

  /*
   * Hanya OWNER / ADMIN
   */

  if (!isOwnerOrAdmin(req.membership)) {
    res.status(403).json({
      message:
        'Anda tidak memiliki akses ke halaman Budget.',
      code: 'BUDGET_ACCESS_DENIED',
    });

    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| BUDGET STATUS
|--------------------------------------------------------------------------
*/

const statusFor = (percentage) => {
  if (percentage > 100) {
    return 'MELEBIHI_BUDGET';
  }

  if (percentage >= 90) {
    return 'HAMPIR_HABIS';
  }

  if (percentage >= 70) {
    return 'PERHATIAN';
  }

  return 'AMAN';
};

/*
|--------------------------------------------------------------------------
| GET BUDGET
|--------------------------------------------------------------------------
*/

const getBudget = async (id, tenantId) => {
  return prisma.budget.findFirst({
    where: {
      id,
      tenantId,
    },

    include: {
      category: true,
    },
  });
};

/*
|--------------------------------------------------------------------------
| GET /api/budgets
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh melihat budget
|
| MEMBER / VIEWER
| -> 403
|
| Query:
| ?period=YYYY-MM
|
| Jika tidak ada data:
| -> 200 []
|
|--------------------------------------------------------------------------
*/

const listBudgets = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;

  /*
   * Tenant validation
   */

  if (!tenantId) {
    return res.status(400).json({
      message: 'Tenant tidak ditemukan.',
    });
  }

  /*
   * Authorization
   *
   * MEMBER / VIEWER langsung diblok.
   */

  if (!requireBudgetAccess(req, res)) {
    return;
  }

  const { period } = req.query;

  /*
   * Period validation
   */

  if (
    period &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)
  ) {
    return res.status(400).json({
      message:
        'Format periode harus YYYY-MM.',
    });
  }

  /*
   * Get budgets
   */

  const budgets = await prisma.budget.findMany({
    where: {
      tenantId,

      ...(period
        ? {
            period,
          }
        : {}),
    },

    include: {
      category: true,
    },

    orderBy: [
      {
        period: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  /*
   * Tidak ada data budget
   *
   * Bukan error.
   */

  if (budgets.length === 0) {
    return res.json([]);
  }

  /*
   * Enrich budget
   */

  const enriched = await Promise.all(
    budgets.map(async (budget) => {
      const [year, month] = budget.period
        .split('-')
        .map(Number);

      /*
       * Awal periode
       */

      const start = new Date(
        year,
        month - 1,
        1,
        0,
        0,
        0,
        0
      );

      /*
       * Akhir periode
       */

      const end = new Date(
        year,
        month,
        0,
        23,
        59,
        59,
        999
      );

      /*
       * Hitung pengeluaran
       */

      const usedResult =
        await prisma.transaction.aggregate({
          where: {
            tenantId,

            type: 'EXPENSE',

            categoryId:
              budget.categoryId,

            date: {
              gte: start,
              lte: end,
            },
          },

          _sum: {
            amount: true,
          },
        });

      const usedAmount = Number(
        usedResult._sum.amount || 0
      );

      const budgetAmount = Number(
        budget.amount
      );

      const percentage =
        budgetAmount > 0
          ? (usedAmount / budgetAmount) * 100
          : 0;

      return {
        ...budget,

        amount: budgetAmount,

        used: usedAmount,

        remaining:
          budgetAmount - usedAmount,

        percentage:
          Math.round(
            percentage * 100
          ) / 100,

        status:
          statusFor(percentage),
      };
    })
  );

  return res.json(enriched);
});

/*
|--------------------------------------------------------------------------
| POST /api/budgets
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh membuat budget
|
| MEMBER / VIEWER
| -> 403
|
|--------------------------------------------------------------------------
*/

const createBudget = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;

  /*
   * Tenant validation
   */

  if (!tenantId) {
    return res.status(400).json({
      message: 'Tenant tidak ditemukan.',
    });
  }

  /*
   * Authorization
   */

  if (!requireBudgetAccess(req, res)) {
    return;
  }

  const {
    categoryId,
    period,
    amount,
  } = req.body;

  /*
   * Category validation
   */

  if (!categoryId) {
    return res.status(400).json({
      message:
        'Kategori wajib dipilih.',
    });
  }

  /*
   * Period validation
   */

  if (
    !period ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(
      period
    )
  ) {
    return res.status(400).json({
      message:
        'Format periode harus YYYY-MM.',
    });
  }

  /*
   * Amount validation
   */

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    return res.status(400).json({
      message:
        'Budget harus berupa angka dan lebih besar dari 0.',
    });
  }

  /*
   * Category validation
   *
   * Budget hanya boleh menggunakan:
   * - kategori tenant yang sama
   * - type EXPENSE
   * - kategori ACTIVE
   */

  const category =
    await prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
        type: 'EXPENSE',
        isActive: true,
      },
    });

  if (!category) {
    return res.status(400).json({
      message:
        'Kategori pengeluaran tidak ditemukan atau sudah tidak aktif.',
    });
  }

  /*
   * Duplicate validation
   */

  const duplicate =
    await prisma.budget.findUnique({
      where: {
        tenantId_categoryId_period: {
          tenantId,
          categoryId,
          period,
        },
      },
    });

  if (duplicate) {
    return res.status(409).json({
      message:
        'Budget untuk kategori dan periode tersebut sudah ada.',
    });
  }

  /*
   * Create budget
   */

  const budget =
    await prisma.budget.create({
      data: {
        tenantId,

        categoryId,

        period,

        amount: numericAmount,
      },

      include: {
        category: true,
      },
    });

  /*
   * Audit
   */

  await writeAudit({
    tenantId,

    userId,

    action: 'CREATE',

    module: 'Budget',

    recordId: budget.id,

    newValue: budget,
  });

  return res.status(201).json({
    ...budget,

    amount: Number(
      budget.amount
    ),

    used: 0,

    remaining: numericAmount,

    percentage: 0,

    status: 'AMAN',
  });
});

/*
|--------------------------------------------------------------------------
| PATCH /api/budgets/:id
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh edit
|
| MEMBER / VIEWER
| -> 403
|
|--------------------------------------------------------------------------
*/

const updateBudget = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  /*
   * Tenant validation
   */

  if (!tenantId) {
    return res.status(400).json({
      message:
        'Tenant tidak ditemukan.',
    });
  }

  /*
   * Authorization
   */

  if (!requireBudgetAccess(req, res)) {
    return;
  }

  /*
   * Get budget
   */

  const budget =
    await getBudget(
      id,
      tenantId
    );

  if (!budget) {
    return res.status(404).json({
      message:
        'Budget tidak ditemukan.',
    });
  }

  /*
   * Amount validation
   */

  const numericAmount =
    Number(req.body.amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    return res.status(400).json({
      message:
        'Budget harus berupa angka dan lebih besar dari 0.',
    });
  }

  /*
   * Update
   */

  const updated =
    await prisma.budget.update({
      where: {
        id,
      },

      data: {
        amount:
          numericAmount,
      },

      include: {
        category: true,
      },
    });

  /*
   * Audit
   */

  await writeAudit({
    tenantId,

    userId,

    action: 'UPDATE',

    module: 'Budget',

    recordId: id,

    oldValue: budget,

    newValue: updated,
  });

  return res.json({
    ...updated,

    amount: Number(
      updated.amount
    ),
  });
});

/*
|--------------------------------------------------------------------------
| DELETE /api/budgets/:id
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh hapus
|
| MEMBER / VIEWER
| -> 403
|
|--------------------------------------------------------------------------
*/

const deleteBudget = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  /*
   * Tenant validation
   */

  if (!tenantId) {
    return res.status(400).json({
      message:
        'Tenant tidak ditemukan.',
    });
  }

  /*
   * Authorization
   */

  if (!requireBudgetAccess(req, res)) {
    return;
  }

  /*
   * Get budget
   */

  const budget =
    await getBudget(
      id,
      tenantId
    );

  if (!budget) {
    return res.status(404).json({
      message:
        'Budget tidak ditemukan.',
    });
  }

  /*
   * Delete
   */

  await prisma.budget.delete({
    where: {
      id,
    },
  });

  /*
   * Audit
   */

  await writeAudit({
    tenantId,

    userId,

    action: 'DELETE',

    module: 'Budget',

    recordId: id,

    oldValue: budget,
  });

  return res.json({
    message:
      'Budget berhasil dihapus.',
  });
});

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
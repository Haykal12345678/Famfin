const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

/*
|--------------------------------------------------------------------------
| ROLE HELPERS
|--------------------------------------------------------------------------
*/

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(membership?.role);
};

/*
|--------------------------------------------------------------------------
| ACCOUNT ACCESS HELPERS
|--------------------------------------------------------------------------
*/

const getAccountAccess = async (accountId, userId) => {
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
| CAN VIEW ACCOUNT
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> Full access ke account ACTIVE
|
| MEMBER / VIEWER
| -> harus punya canView = true
| -> account harus ACTIVE
|
|--------------------------------------------------------------------------
*/

const canViewAccount = async (req, accountId) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;

  /*
   * OWNER / ADMIN
   */

  if (isOwnerOrAdmin(req.membership)) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        tenantId,
        isActive: true,
      },
    });

    return Boolean(account);
  }

  /*
   * MEMBER / VIEWER
   */

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenantId,
      isActive: true,
    },
  });

  if (!account) {
    return false;
  }

  const access = await getAccountAccess(
    accountId,
    userId
  );

  return access?.canView === true;
};

/*
|--------------------------------------------------------------------------
| CAN MANAGE ACCOUNT
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> Full access ke account ACTIVE
|
| MEMBER
| -> canManage = true
|
| VIEWER
| -> tidak boleh
|
|--------------------------------------------------------------------------
*/

const canManageAccount = async (req, accountId) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;

  /*
   * OWNER / ADMIN
   */

  if (isOwnerOrAdmin(req.membership)) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        tenantId,
        isActive: true,
      },
    });

    return Boolean(account);
  }

  /*
   * MEMBER / VIEWER
   */

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenantId,
      isActive: true,
    },
  });

  if (!account) {
    return false;
  }

  const access = await getAccountAccess(
    accountId,
    userId
  );

  return access?.canManage === true;
};

/*
|--------------------------------------------------------------------------
| CHECK GOALS PAGE ACCESS
|--------------------------------------------------------------------------
|
| Digunakan untuk memastikan MEMBER / VIEWER
| memang mempunyai minimal satu account ACTIVE
| yang bisa dilihat.
|
| OWNER / ADMIN
| -> selalu boleh
|
| MEMBER / VIEWER
| -> minimal punya account ACTIVE + canView
|
|--------------------------------------------------------------------------
*/

const canAccessGoalsPage = async (req) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;

  /*
   * OWNER / ADMIN
   */

  if (isOwnerOrAdmin(membership)) {
    return true;
  }

  /*
   * MEMBER / VIEWER
   */

  const accessibleAccount =
    await prisma.account.findFirst({
      where: {
        tenantId,
        isActive: true,

        accesses: {
          some: {
            userId,
            canView: true,
          },
        },
      },

      select: {
        id: true,
      },
    });

  return Boolean(accessibleAccount);
};

/*
|--------------------------------------------------------------------------
| ENRICH GOAL
|--------------------------------------------------------------------------
*/

const enrichGoal = (goal) => {
  const target = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);

  const progress =
    target > 0
      ? (current / target) * 100
      : 0;

  return {
    ...goal,

    targetAmount: target,

    initialAmount: Number(
      goal.initialAmount
    ),

    currentAmount: current,

    progressPercentage:
      Math.round(progress * 100) / 100,

    shortfall:
      Math.max(target - current, 0),
  };
};

/*
|--------------------------------------------------------------------------
| GET /api/goals
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> semua goal dari account ACTIVE
|
| MEMBER / VIEWER
| -> hanya goal dari account ACTIVE
|    yang canView = true
|
| Jika user tidak punya akses ke account manapun:
| -> 403
|
| Jika user punya akses tapi belum ada goal:
| -> []
|
|--------------------------------------------------------------------------
*/

const listGoals = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;

  /*
   * Tenant validation
   */

  if (!tenantId) {
    return res.status(400).json({
      message: 'Tenant tidak ditemukan.',
    });
  }

  /*
   * Membership validation
   */

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  /*
   * Page authorization
   *
   * Kalau MEMBER / VIEWER tidak punya satupun
   * account ACTIVE dengan canView = true,
   * langsung block.
   */

  const pageAllowed =
    await canAccessGoalsPage(req);

  if (!pageAllowed) {
    return res.status(403).json({
      message:
        'Anda tidak memiliki akses ke halaman Target Tabungan.',
    });
  }

  /*
   |--------------------------------------------------------------------------
   | OWNER / ADMIN
   |--------------------------------------------------------------------------
   */

  if (isOwnerOrAdmin(membership)) {
    const goals =
      await prisma.financialGoal.findMany({
        where: {
          tenantId,

          /*
           * Hanya rekening ACTIVE
           */

          account: {
            isActive: true,
          },
        },

        include: {
          account: true,
        },

        orderBy: {
          targetDate: 'asc',
        },
      });

    return res.json(
      goals.map(enrichGoal)
    );
  }

  /*
   |--------------------------------------------------------------------------
   | MEMBER / VIEWER
   |--------------------------------------------------------------------------
   |
   | Hanya goal yang rekeningnya:
   |
   | 1. ACTIVE
   | 2. Dimiliki tenant yang sama
   | 3. User punya canView = true
   |
   */

  const goals =
    await prisma.financialGoal.findMany({
      where: {
        tenantId,

        account: {
          isActive: true,

          accesses: {
            some: {
              userId,
              canView: true,
            },
          },
        },
      },

      include: {
        account: true,
      },

      orderBy: {
        targetDate: 'asc',
      },
    });

  return res.json(
    goals.map(enrichGoal)
  );
});

/*
|--------------------------------------------------------------------------
| POST /api/goals
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh membuat
|
| MEMBER
| -> boleh jika canManage = true
|
| VIEWER
| -> tidak boleh
|
|--------------------------------------------------------------------------
*/

const createGoal = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;

  /*
   * Tenant validation
   */

  if (!tenantId) {
    return res.status(400).json({
      message: 'Tenant tidak ditemukan.',
    });
  }

  /*
   * Membership validation
   */

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  const {
    name,
    targetAmount,
    initialAmount = 0,
    targetDate,
    accountId,
    description,
  } = req.body;

  /*
   |--------------------------------------------------------------------------
   | Name validation
   |--------------------------------------------------------------------------
   */

  const goalName =
    typeof name === 'string'
      ? name.trim()
      : '';

  if (!goalName) {
    return res.status(400).json({
      message: 'Nama target wajib diisi.',
    });
  }

  /*
   |--------------------------------------------------------------------------
   | Amount validation
   |--------------------------------------------------------------------------
   */

  const target = Number(targetAmount);
  const initial = Number(initialAmount);

  if (
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return res.status(400).json({
      message:
        'Target nominal harus lebih besar dari 0.',
    });
  }

  if (
    !Number.isFinite(initial) ||
    initial < 0
  ) {
    return res.status(400).json({
      message:
        'Nominal awal tidak valid.',
    });
  }

  if (initial > target) {
    return res.status(400).json({
      message:
        'Nominal awal tidak boleh melebihi target.',
    });
  }

  /*
   |--------------------------------------------------------------------------
   | Account validation
   |--------------------------------------------------------------------------
   */

  if (!accountId) {
    return res.status(400).json({
      message:
        'Rekening tujuan wajib dipilih.',
    });
  }

  const account =
    await prisma.account.findFirst({
      where: {
        id: accountId,
        tenantId,
        isActive: true,
      },
    });

  if (!account) {
    return res.status(400).json({
      message:
        'Rekening tujuan tidak valid atau nonaktif.',
    });
  }

  /*
   |--------------------------------------------------------------------------
   | Permission
   |--------------------------------------------------------------------------
   */

  const allowed =
    await canManageAccount(
      req,
      accountId
    );

  if (!allowed) {
    return res.status(403).json({
      message:
        'Anda tidak memiliki izin untuk membuat target tabungan pada rekening ini.',
    });
  }

  /*
   |--------------------------------------------------------------------------
   | Target date validation
   |--------------------------------------------------------------------------
   */

  if (!targetDate) {
    return res.status(400).json({
      message:
        'Tanggal target wajib diisi.',
    });
  }

  const targetDateObj =
    new Date(targetDate);

  if (
    Number.isNaN(
      targetDateObj.getTime()
    )
  ) {
    return res.status(400).json({
      message:
        'Tanggal target tidak valid.',
    });
  }

  targetDateObj.setHours(
    0,
    0,
    0,
    0
  );

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  if (targetDateObj < today) {
    return res.status(400).json({
      message:
        'Tanggal target tidak boleh sebelum tanggal sekarang.',
    });
  }

  /*
   |--------------------------------------------------------------------------
   | Create
   |--------------------------------------------------------------------------
   */

  const goal =
    await prisma.financialGoal.create({
      data: {
        tenantId,

        name: goalName,

        targetAmount: target,

        initialAmount: initial,

        currentAmount: initial,

        targetDate: targetDateObj,

        accountId,

        description:
          typeof description === 'string'
            ? description.trim() || null
            : null,
      },

      include: {
        account: true,
      },
    });

  /*
   |--------------------------------------------------------------------------
   | Audit
   |--------------------------------------------------------------------------
   */

  await writeAudit({
    tenantId,
    userId,
    action: 'CREATE',
    module: 'FinancialGoal',
    recordId: goal.id,
    newValue: goal,
  });

  return res.status(201).json(
    enrichGoal(goal)
  );
});

/*
|--------------------------------------------------------------------------
| PATCH /api/goals/:id/contribute
|--------------------------------------------------------------------------
*/

const contributeGoal = asyncHandler(
  async (req, res) => {
    const {
      id,
    } = req.params;

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    const amount =
      Number(req.body.amount);

    /*
     * Amount validation
     */

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        message:
          'Nominal harus lebih besar dari 0.',
      });
    }

    /*
     * Get goal
     *
     * Account wajib ACTIVE.
     */

    const goal =
      await prisma.financialGoal.findFirst({
        where: {
          id,
          tenantId,

          account: {
            isActive: true,
          },
        },

        include: {
          account: true,
        },
      });

    if (!goal) {
      return res.status(404).json({
        message:
          'Target tabungan tidak ditemukan.',
      });
    }

    /*
     * Permission
     */

    const allowed =
      await canManageAccount(
        req,
        goal.accountId
      );

    if (!allowed) {
      return res.status(403).json({
        message:
          'Anda tidak memiliki izin untuk menambah tabungan pada target ini.',
      });
    }

    const current =
      Number(goal.currentAmount);

    const target =
      Number(goal.targetAmount);

    /*
     * Cannot exceed target
     */

    if (
      current + amount >
      target
    ) {
      return res.status(400).json({
        message:
          'Nominal kontribusi melebihi sisa target tabungan.',

        remaining:
          Math.max(
            target - current,
            0
          ),
      });
    }

    /*
     * Update
     */

    const updated =
      await prisma.financialGoal.update({
        where: {
          id,
        },

        data: {
          currentAmount: {
            increment: amount,
          },
        },

        include: {
          account: true,
        },
      });

    /*
     * Audit
     */

    await writeAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'FinancialGoal',
      recordId: id,
      oldValue: goal,
      newValue: updated,
    });

    return res.json(
      enrichGoal(updated)
    );
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/goals/:id
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> full
|
| MEMBER
| -> canManage account lama
| -> canManage account baru jika pindah
|
| VIEWER
| -> tidak boleh
|
|--------------------------------------------------------------------------
*/

const updateGoal = asyncHandler(
  async (req, res) => {
    const {
      id,
    } = req.params;

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    const {
      name,
      targetAmount,
      targetDate,
      accountId,
      description,
    } = req.body;

    /*
     * Get existing goal
     *
     * Account lama harus ACTIVE.
     */

    const goal =
      await prisma.financialGoal.findFirst({
        where: {
          id,
          tenantId,

          account: {
            isActive: true,
          },
        },

        include: {
          account: true,
        },
      });

    if (!goal) {
      return res.status(404).json({
        message:
          'Target tabungan tidak ditemukan.',
      });
    }

    /*
     * Permission account lama
     */

    const oldAccountAllowed =
      await canManageAccount(
        req,
        goal.accountId
      );

    if (!oldAccountAllowed) {
      return res.status(403).json({
        message:
          'Anda tidak memiliki izin untuk mengubah target tabungan ini.',
      });
    }

    /*
     * Name validation
     */

    const goalName =
      typeof name === 'string'
        ? name.trim()
        : '';

    if (!goalName) {
      return res.status(400).json({
        message:
          'Nama target wajib diisi.',
      });
    }

    /*
     * Amount validation
     */

    const target =
      Number(targetAmount);

    if (
      !Number.isFinite(target) ||
      target <= 0
    ) {
      return res.status(400).json({
        message:
          'Target nominal harus lebih besar dari 0.',
      });
    }

    const current =
      Number(goal.currentAmount);

    if (current > target) {
      return res.status(400).json({
        message:
          'Target nominal tidak boleh kurang dari jumlah yang sudah terkumpul.',
      });
    }

    /*
     * Target date validation
     */

    if (!targetDate) {
      return res.status(400).json({
        message:
          'Tanggal target wajib diisi.',
      });
    }

    const targetDateObj =
      new Date(targetDate);

    if (
      Number.isNaN(
        targetDateObj.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          'Tanggal target tidak valid.',
      });
    }

    targetDateObj.setHours(
      0,
      0,
      0,
      0
    );

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (targetDateObj < today) {
      return res.status(400).json({
        message:
          'Tanggal target tidak boleh sebelum tanggal sekarang.',
      });
    }

    /*
     * Account validation
     */

    if (!accountId) {
      return res.status(400).json({
        message:
          'Rekening tujuan wajib dipilih.',
      });
    }

    const account =
      await prisma.account.findFirst({
        where: {
          id: accountId,
          tenantId,
          isActive: true,
        },
      });

    if (!account) {
      return res.status(400).json({
        message:
          'Rekening tujuan tidak valid atau nonaktif.',
      });
    }

    /*
     * Kalau pindah account,
     * harus punya canManage di account baru.
     */

    if (
      accountId !==
      goal.accountId
    ) {
      const newAccountAllowed =
        await canManageAccount(
          req,
          accountId
        );

      if (!newAccountAllowed) {
        return res.status(403).json({
          message:
            'Anda tidak memiliki izin untuk memindahkan target ke rekening tersebut.',
        });
      }
    }

    /*
     * Update
     */

    const updated =
      await prisma.financialGoal.update({
        where: {
          id,
        },

        data: {
          name: goalName,

          targetAmount: target,

          targetDate:
            targetDateObj,

          accountId,

          description:
            typeof description === 'string'
              ? description.trim() || null
              : null,
        },

        include: {
          account: true,
        },
      });

    /*
     * Audit
     */

    await writeAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'FinancialGoal',
      recordId: id,
      oldValue: goal,
      newValue: updated,
    });

    return res.json(
      enrichGoal(updated)
    );
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/goals/:id
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> boleh
|
| MEMBER
| -> canManage
|
| VIEWER
| -> tidak boleh
|
|--------------------------------------------------------------------------
*/

const deleteGoal = asyncHandler(
  async (req, res) => {
    const {
      id,
    } = req.params;

    const tenantId =
      req.tenantId;

    const userId =
      req.user.id;

    /*
     * Get goal
     */

    const goal =
      await prisma.financialGoal.findFirst({
        where: {
          id,
          tenantId,
        },

        include: {
          account: true,
        },
      });

    if (!goal) {
      return res.status(404).json({
        message:
          'Target tabungan tidak ditemukan.',
      });
    }

    /*
     * Account harus ACTIVE
     */

    if (!goal.account?.isActive) {
      return res.status(400).json({
        message:
          'Target tabungan berada pada rekening yang sudah nonaktif.',
      });
    }

    /*
     * Permission
     */

    const allowed =
      await canManageAccount(
        req,
        goal.accountId
      );

    if (!allowed) {
      return res.status(403).json({
        message:
          'Anda tidak memiliki izin untuk menghapus target tabungan ini.',
      });
    }

    /*
     * Delete
     */

    await prisma.financialGoal.delete({
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
      module: 'FinancialGoal',
      recordId: id,
      oldValue: goal,
    });

    return res.json({
      message:
        'Target tabungan berhasil dihapus.',
    });
  }
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  listGoals,
  createGoal,
  contributeGoal,
  updateGoal,
  deleteGoal,
};
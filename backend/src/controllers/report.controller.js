const asyncHandler = require("express-async-handler");
const prisma = require("../utils/prisma");

// ===================================================
// PERIOD
// ===================================================

function getPeriodRange(period) {
  const now = new Date();

  let start;
  let end;

  switch (period) {
    case "today":
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      break;

    case "this_week": {
      const day = now.getDay() || 7;

      start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case "last_month":
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      break;

    case "3_months":
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      break;

    case "this_year":
      start = new Date(
        now.getFullYear(),
        0,
        1
      );

      end = new Date(
        now.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
      );
      break;

    default:
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
  }

  return {
    start,
    end,
  };
}

// ===================================================
// ACCOUNT FILTER
// ===================================================

async function getAllowedAccountFilter(req) {

  if (
    ["OWNER", "ADMIN"].includes(
      req.membership.role
    )
  ) {
    return {};
  }

  const accesses =
    await prisma.accountAccess.findMany({
      where: {
        userId: req.user.id,
        canView: true,
      },
      select: {
        accountId: true,
      },
    });

  return {
    accountId: {
      in: accesses.map(
        (a) => a.accountId
      ),
    },
  };
}

// ===================================================
// GET DASHBOARD
// ===================================================

const getDashboard =
  asyncHandler(async (req, res) => {

    const {
      period,
      startDate,
      endDate,
    } = req.query;

    const { start, end } =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : getPeriodRange(period);

    const accountFilter =
      await getAllowedAccountFilter(req);

    const transactionWhere = {
      tenantId: req.tenantId,
      date: {
        gte: start,
        lte: end,
      },
      ...accountFilter,
    };

    const currentPeriod =
      `${start.getFullYear()}-${String(
        start.getMonth() + 1
      ).padStart(2, "0")}`;

    const [

      accounts,

      incomeAgg,

      expenseAgg,

      transactions,

      transactionCount,

      categoryCount,

      budgets,

      financialGoals,

    ] = await Promise.all([

      // ===========================
      // Accounts
      // ===========================

      prisma.account.findMany({
        where: {
          tenantId: req.tenantId,
          isActive: true,
          ...accountFilter,
        },
        orderBy: {
          name: "asc",
        },
      }),

      // ===========================
      // Income
      // ===========================

      prisma.transaction.aggregate({
        where: {
          ...transactionWhere,
          type: "INCOME",
        },
        _sum: {
          amount: true,
        },
      }),

      // ===========================
      // Expense
      // ===========================

      prisma.transaction.aggregate({
        where: {
          ...transactionWhere,
          type: "EXPENSE",
        },
        _sum: {
          amount: true,
        },
      }),

      // ===========================
      // Transactions
      // ===========================

      prisma.transaction.findMany({
        where: transactionWhere,
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          date: "desc",
        },
      }),

      // ===========================
      // Statistics
      // ===========================

      prisma.transaction.count({
        where: transactionWhere,
      }),

      prisma.category.count({
        where: {
          tenantId: req.tenantId,
          isActive: true,
        },
      }),

      // ===========================
      // Budget
      // ===========================

      prisma.budget.findMany({
        where: {
          tenantId: req.tenantId,
          period: currentPeriod,
        },
        include: {
          category: true,
        },
      }),

      // ===========================
      // Financial Goal
      // ===========================

      prisma.financialGoal.findMany({
        where: {
          tenantId: req.tenantId,
        },
        include: {
          account: true,
        },
        orderBy: {
          targetDate: "asc",
        },
      }),

    ]);
        // ===================================================
    // KPI
    // ===================================================

    const totalSaldo = accounts.reduce(
      (sum, account) =>
        sum + Number(account.currentBalance),
      0
    );

    const totalIncome = Number(
      incomeAgg._sum.amount || 0
    );

    const totalExpense = Number(
      expenseAgg._sum.amount || 0
    );

    const cashFlow =
      totalIncome - totalExpense;

    // ===================================================
    // EXPENSE BY CATEGORY
    // ===================================================

    const expenseCategoryMap = {};

    transactions.forEach((trx) => {

      if (trx.type !== "EXPENSE") return;

      const name =
        trx.category?.name ||
        "Lainnya";

      expenseCategoryMap[name] =
        (expenseCategoryMap[name] || 0) +
        Number(trx.amount);

    });

    const expenseByCategory =
      Object.entries(
        expenseCategoryMap
      ).map(([name, value]) => ({
        name,
        value,
      }));

    // ===================================================
    // EXPENSE BY ACCOUNT
    // ===================================================

    const expenseAccountMap = {};

    transactions.forEach((trx) => {

      if (trx.type !== "EXPENSE") return;

      const name =
        trx.account?.name || "-";

      expenseAccountMap[name] =
        (expenseAccountMap[name] || 0) +
        Number(trx.amount);

    });

    const expenseByAccount =
      Object.entries(
        expenseAccountMap
      ).map(([name, value]) => ({
        name,
        value,
      }));

    // ===================================================
    // RECENT TRANSACTION
    // ===================================================

    const recentTransactions =
      transactions
        .slice(0, 8)
        .map((trx) => ({

          id: trx.id,

          description:
            trx.note ||
            trx.category?.name ||
            trx.account?.name ||
            "-",

          amount: Number(trx.amount),

          type: trx.type,

          category:
            trx.category?.name || "-",

          account:
            trx.account?.name || "-",

          date: trx.date.toLocaleDateString(
            "id-ID"
          ),

        }));

    // ===================================================
    // BUDGET PROGRESS
    // ===================================================

    const budgetData =
      budgets.map((budget) => {

        const used =
          transactions
            .filter(
              (trx) =>
                trx.type ===
                  "EXPENSE" &&
                trx.categoryId ===
                  budget.categoryId
            )
            .reduce(
              (sum, trx) =>
                sum +
                Number(trx.amount),
              0
            );

        const limit =
          Number(budget.amount);

        return {

          id: budget.id,

          name:
            budget.category?.name ||
            "Tanpa Kategori",

          categoryId:
            budget.categoryId,

          period:
            budget.period,

          limit,

          used,

          remaining:
            limit - used,

          percentage:
            limit > 0
              ? Math.min(
                  100,
                  (used / limit) *
                    100
                )
              : 0,

        };

      });

    // ===================================================
    // FINANCIAL GOALS
    // ===================================================

    const savingGoalData =
      financialGoals.map(
        (goal) => {

          const target =
            Number(
              goal.targetAmount
            );

          const saved =
            Number(
              goal.currentAmount
            );

          return {

            id: goal.id,

            name: goal.name,

            account:
              goal.account?.name ||
              "-",

            target,

            initial:
              Number(
                goal.initialAmount
              ),

            saved,

            remaining:
              Math.max(
                0,
                target - saved
              ),

            percentage:
              target > 0
                ? Math.min(
                    100,
                    (saved /
                      target) *
                      100
                  )
                : 0,

            targetDate:
              goal.targetDate,

            description:
              goal.description,

          };

        }
      );

    // ===================================================
    // STATISTICS
    // ===================================================

    const statistics = {

      categoryCount,

      transactionCount,

      budgetCount:
        budgets.length,

      accountCount:
        accounts.length,

      goalCount:
        financialGoals.length,

    };
        // ===================================================
    // RESPONSE
    // ===================================================

    res.json({

      period: {
        start,
        end,
      },

      totalSaldo,

      totalIncome,

      totalExpense,

      cashFlow,

      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: Number(account.currentBalance),
      })),

      expenseByCategory,

      expenseByAccount,

      recentTransactions,

      budgets: budgetData,

      savingGoals: savingGoalData,

      statistics,

    });

});

// =======================================================
// REPORT INCOME
// =======================================================

const reportIncome = asyncHandler(async (req, res) => {

  const {
    startDate,
    endDate,
    categoryId,
    accountId,
  } = req.query;

  const accountFilter =
    await getAllowedAccountFilter(req);

  const items =
    await prisma.transaction.findMany({

      where: {

        tenantId: req.tenantId,

        type: "INCOME",

        ...(startDate &&
          endDate && {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),

        ...(categoryId && {
          categoryId,
        }),

        ...(accountId
          ? { accountId }
          : accountFilter),

      },

      include: {
        category: true,
        account: true,
      },

      orderBy: {
        date: "desc",
      },

    });

  const total =
    items.reduce(
      (sum, trx) =>
        sum + Number(trx.amount),
      0
    );

  res.json({
    total,
    count: items.length,
    items,
  });

});

// =======================================================
// REPORT EXPENSE
// =======================================================

const reportExpense = asyncHandler(async (req, res) => {

  const {
    startDate,
    endDate,
    categoryId,
    accountId,
  } = req.query;

  const accountFilter =
    await getAllowedAccountFilter(req);

  const items =
    await prisma.transaction.findMany({

      where: {

        tenantId: req.tenantId,

        type: "EXPENSE",

        ...(startDate &&
          endDate && {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),

        ...(categoryId && {
          categoryId,
        }),

        ...(accountId
          ? { accountId }
          : accountFilter),

      },

      include: {
        category: true,
        account: true,
      },

      orderBy: {
        date: "desc",
      },

    });

  const total =
    items.reduce(
      (sum, trx) =>
        sum + Number(trx.amount),
      0
    );

  res.json({
    total,
    count: items.length,
    items,
  });

});

// =======================================================
// CASHFLOW
// =======================================================

const reportCashflow = asyncHandler(async (req, res) => {

  const {
    startDate,
    endDate,
  } = req.query;

  const accountFilter =
    await getAllowedAccountFilter(req);

  const where = {

    tenantId: req.tenantId,

    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),

    ...accountFilter,

  };

  const [
    income,
    expense,
  ] = await Promise.all([

    prisma.transaction.aggregate({
      where: {
        ...where,
        type: "INCOME",
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.transaction.aggregate({
      where: {
        ...where,
        type: "EXPENSE",
      },
      _sum: {
        amount: true,
      },
    }),

  ]);

  const totalIncome =
    Number(
      income._sum.amount || 0
    );

  const totalExpense =
    Number(
      expense._sum.amount || 0
    );

  res.json({

    totalIncome,

    totalExpense,

    netCashFlow:
      totalIncome -
      totalExpense,

  });

});

// =======================================================
// TOP EXPENSE CATEGORY
// =======================================================

const reportTopExpenseCategory = asyncHandler(async (req, res) => {

  const {
    startDate,
    endDate,
    limit = 5,
  } = req.query;

  const accountFilter =
    await getAllowedAccountFilter(req);

  const items =
    await prisma.transaction.findMany({

      where: {

        tenantId: req.tenantId,

        type: "EXPENSE",

        ...(startDate &&
          endDate && {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),

        ...accountFilter,

      },

      include: {
        category: true,
      },

    });

  const grouped = {};

  items.forEach((trx) => {

    const name =
      trx.category?.name ||
      "Lainnya";

    grouped[name] =
      (grouped[name] || 0) +
      Number(trx.amount);

  });

  const result =
    Object.entries(grouped)
      .map(([name, total]) => ({
        name,
        total,
      }))
      .sort(
        (a, b) =>
          b.total - a.total
      )
      .slice(
        0,
        Number(limit)
      );

  res.json(result);

});

// =======================================================

module.exports = {

  getDashboard,

  reportIncome,

  reportExpense,

  reportCashflow,

  reportTopExpenseCategory,

  getAllowedAccountFilter,

};
const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

/*
|--------------------------------------------------------------------------
| ROLE HELPERS
|--------------------------------------------------------------------------
*/

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(
    membership?.role
  );
};

/*
|--------------------------------------------------------------------------
| ACCOUNT ACCESS HELPERS
|--------------------------------------------------------------------------
*/

/**
 * Ambil ID rekening yang boleh dilihat user.
 *
 * OWNER / ADMIN
 * -> boleh melihat semua rekening tenant.
 *
 * MEMBER
 * -> hanya rekening yang memiliki AccountAccess
 *    dengan canView = true.
 */
const getAllowedAccountIds = async (req) => {
  if (isOwnerOrAdmin(req.membership)) {
    return null;
  }

  const accesses =
    await prisma.accountAccess.findMany({
      where: {
        userId: req.user.id,

        canView: true,

        account: {
          tenantId: req.tenantId,

          isActive: true,
        },
      },

      select: {
        accountId: true,
      },
    });

  return accesses.map(
    (item) => item.accountId
  );
};

/**
 * Filter untuk Transaction.
 *
 * Transaction punya:
 * accountId
 */
const getAllowedAccountFilter = async (req) => {
  const accountIds =
    await getAllowedAccountIds(req);

  /*
   * OWNER / ADMIN
   * Tidak perlu filter account.
   */
  if (accountIds === null) {
    return {};
  }

  /*
   * MEMBER tanpa akses rekening.
   *
   * in: [] memastikan tidak mengambil
   * transaksi milik rekening lain.
   */
  return {
    accountId: {
      in: accountIds,
    },
  };
};

/**
 * Filter untuk Account.
 *
 * Account punya:
 * id
 *
 * JANGAN menggunakan accountId di sini.
 */
const getAllowedAccountWhere = async (req) => {
  const accountIds =
    await getAllowedAccountIds(req);

  /*
   * OWNER / ADMIN
   */
  if (accountIds === null) {
    return {};
  }

  /*
   * MEMBER
   */
  return {
    id: {
      in: accountIds,
    },
  };
};

/*
|--------------------------------------------------------------------------
| DATE FILTER
|--------------------------------------------------------------------------
*/

const getDateFilter = (
  startDate,
  endDate
) => {
  const date = {};

  if (startDate) {
    const start = new Date(startDate);

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
    const end = new Date(endDate);

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

  return Object.keys(date).length > 0
    ? { date }
    : {};
};

/*
|--------------------------------------------------------------------------
| PERIOD FILTER
|--------------------------------------------------------------------------
*/

const getPeriodFilter = (
  period
) => {
  const now = new Date();

  let start;
  let end;

  switch (period) {
    /*
    |--------------------------------------------------------------------------
    | TODAY
    |--------------------------------------------------------------------------
    */

    case 'today': {
      start = new Date(now);

      start.setHours(
        0,
        0,
        0,
        0
      );

      end = new Date(now);

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | THIS WEEK
    |--------------------------------------------------------------------------
    */

    case 'this_week': {
      start = new Date(now);

      const day =
        start.getDay();

      /*
       * Sunday = 0
       * Monday = 1
       */

      const diff =
        day === 0
          ? 6
          : day - 1;

      start.setDate(
        start.getDate() - diff
      );

      start.setHours(
        0,
        0,
        0,
        0
      );

      end = new Date(now);

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | THIS MONTH
    |--------------------------------------------------------------------------
    */

    case 'this_month': {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      start.setHours(
        0,
        0,
        0,
        0
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | LAST MONTH
    |--------------------------------------------------------------------------
    */

    case 'last_month': {
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      start.setHours(
        0,
        0,
        0,
        0
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | 3 MONTHS
    |--------------------------------------------------------------------------
    */

    case '3_months': {
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        1
      );

      start.setHours(
        0,
        0,
        0,
        0
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | THIS YEAR
    |--------------------------------------------------------------------------
    */

    case 'this_year': {
      start = new Date(
        now.getFullYear(),
        0,
        1
      );

      start.setHours(
        0,
        0,
        0,
        0
      );

      end = new Date(
        now.getFullYear(),
        11,
        31
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }

    default:
      return {};
  }

  return {
    date: {
      gte: start,
      lte: end,
    },
  };
};

/*
|--------------------------------------------------------------------------
| GET DASHBOARD
|--------------------------------------------------------------------------
| GET /api/dashboard
|--------------------------------------------------------------------------
*/

const getDashboard =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        req.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          message:
            'Tenant tidak ditemukan.',
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message:
            'User tidak terautentikasi.',
        });
      }

      const {
        startDate,
        endDate,
        period = 'this_month',
      } = req.query;

      /*
      |--------------------------------------------------------------------------
      | DATE FILTER
      |--------------------------------------------------------------------------
      */

      let dateFilter;

      try {
        if (
          startDate ||
          endDate
        ) {
          dateFilter =
            getDateFilter(
              startDate,
              endDate
            );
        } else {
          dateFilter =
            getPeriodFilter(
              period
            );
        }
      } catch (error) {
        return res.status(400).json({
          message:
            error.message,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ACCOUNT ACCESS
      |--------------------------------------------------------------------------
      */

      const accountFilter =
        await getAllowedAccountFilter(
          req
        );

      const accountWhere =
        await getAllowedAccountWhere(
          req
        );

      /*
      |--------------------------------------------------------------------------
      | TRANSACTION WHERE
      |--------------------------------------------------------------------------
      */

      const transactionWhere = {
        tenantId,

        ...accountFilter,

        ...dateFilter,
      };

      /*
      |--------------------------------------------------------------------------
      | MAIN QUERIES
      |--------------------------------------------------------------------------
      */

      const [
        incomeResult,
        expenseResult,
        transactionCount,
        accounts,
        recentTransactions,
        categoriesExpense,
        categoriesIncome,
        expenseByAccountGrouped,
        budgets,
        goals,
        categoryCount,
        budgetCount,
      ] =
        await Promise.all([
          /*
          |--------------------------------------------------------------------------
          | INCOME
          |--------------------------------------------------------------------------
          */

          prisma.transaction.aggregate({
            where: {
              ...transactionWhere,

              type: 'INCOME',
            },

            _sum: {
              amount: true,
            },
          }),

          /*
          |--------------------------------------------------------------------------
          | EXPENSE
          |--------------------------------------------------------------------------
          */

          prisma.transaction.aggregate({
            where: {
              ...transactionWhere,

              type: 'EXPENSE',
            },

            _sum: {
              amount: true,
            },
          }),

          /*
          |--------------------------------------------------------------------------
          | TRANSACTION COUNT
          |--------------------------------------------------------------------------
          */

          prisma.transaction.count({
            where:
              transactionWhere,
          }),

          /*
          |--------------------------------------------------------------------------
          | ACCOUNTS
          |--------------------------------------------------------------------------
          |
          | IMPORTANT:
          |
          | MEMBER:
          |   id IN allowedAccountIds
          |
          | OWNER / ADMIN:
          |   tidak ada filter id
          |
          */

          prisma.account.findMany({
            where: {
              tenantId,

              isActive: true,

              ...accountWhere,
            },

            select: {
              id: true,
              name: true,
              type: true,
              currentBalance: true,
            },

            orderBy: {
              name: 'asc',
            },
          }),

          /*
          |--------------------------------------------------------------------------
          | RECENT TRANSACTIONS
          |--------------------------------------------------------------------------
          */

          prisma.transaction.findMany({
            where:
              transactionWhere,

            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },

              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },

              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },

            orderBy: {
              date: 'desc',
            },

            take: 10,
          }),

          /*
          |--------------------------------------------------------------------------
          | EXPENSE BY CATEGORY
          |--------------------------------------------------------------------------
          */

          prisma.transaction.groupBy({
            by: [
              'categoryId',
            ],

            where: {
              ...transactionWhere,

              type: 'EXPENSE',

              categoryId: {
                not: null,
              },
            },

            _sum: {
              amount: true,
            },

            orderBy: {
              _sum: {
                amount: 'desc',
              },
            },

            take: 10,
          }),

          /*
          |--------------------------------------------------------------------------
          | INCOME BY CATEGORY
          |--------------------------------------------------------------------------
          */

          prisma.transaction.groupBy({
            by: [
              'categoryId',
            ],

            where: {
              ...transactionWhere,

              type: 'INCOME',

              categoryId: {
                not: null,
              },
            },

            _sum: {
              amount: true,
            },

            orderBy: {
              _sum: {
                amount: 'desc',
              },
            },

            take: 10,
          }),

          /*
          |--------------------------------------------------------------------------
          | EXPENSE BY ACCOUNT
          |--------------------------------------------------------------------------
          */

          prisma.transaction.groupBy({
            by: [
              'accountId',
            ],

            where: {
              ...transactionWhere,

              type: 'EXPENSE',
            },

            _sum: {
              amount: true,
            },

            orderBy: {
              _sum: {
                amount: 'desc',
              },
            },

            take: 10,
          }),

          /*
          |--------------------------------------------------------------------------
          | BUDGET
          |--------------------------------------------------------------------------
          */

          prisma.budget.findMany({
            where: {
              tenantId,
            },

            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },

            orderBy: {
              period: 'desc',
            },

            take: 20,
          }),

          /*
          |--------------------------------------------------------------------------
          | FINANCIAL GOALS
          |--------------------------------------------------------------------------
          */

          prisma.financialGoal.findMany({
            where: {
              tenantId,

              ...(isOwnerOrAdmin(
                req.membership
              )
                ? {}
                : {
                    account: {
                      accesses: {
                        some: {
                          userId:
                            req.user.id,

                          canView:
                            true,
                        },
                      },
                    },
                  }),
            },

            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },

            orderBy: {
              targetDate: 'asc',
            },

            take: 20,
          }),

          /*
          |--------------------------------------------------------------------------
          | CATEGORY COUNT
          |--------------------------------------------------------------------------
          */

          prisma.category.count({
            where: {
              tenantId,

              isActive: true,
            },
          }),

          /*
          |--------------------------------------------------------------------------
          | BUDGET COUNT
          |--------------------------------------------------------------------------
          */

          prisma.budget.count({
            where: {
              tenantId,
            },
          }),
        ]);

      /*
      |--------------------------------------------------------------------------
      | TOTAL
      |--------------------------------------------------------------------------
      */

      const totalIncome =
        Number(
          incomeResult._sum
            .amount || 0
        );

      const totalExpense =
        Number(
          expenseResult._sum
            .amount || 0
        );

      const cashFlow =
        totalIncome -
        totalExpense;

      /*
      |--------------------------------------------------------------------------
      | CATEGORY DATA
      |--------------------------------------------------------------------------
      */

      const categoryIds = [
        ...categoriesExpense.map(
          (item) =>
            item.categoryId
        ),

        ...categoriesIncome.map(
          (item) =>
            item.categoryId
        ),
      ].filter(Boolean);

      const categoryData =
        categoryIds.length > 0
          ? await prisma.category.findMany(
              {
                where: {
                  tenantId,

                  id: {
                    in: [
                      ...new Set(
                        categoryIds
                      ),
                    ],
                  },
                },

                select: {
                  id: true,
                  name: true,
                },
              }
            )
          : [];

      const categoryMap =
        new Map(
          categoryData.map(
            (category) => [
              category.id,
              category.name,
            ]
          )
        );

      /*
      |--------------------------------------------------------------------------
      | EXPENSE BY CATEGORY
      |--------------------------------------------------------------------------
      */

      const expenseByCategory =
        categoriesExpense.map(
          (item) => ({
            categoryId:
              item.categoryId,

            categoryName:
              categoryMap.get(
                item.categoryId
              ) ||
              'Tanpa Kategori',

            amount: Number(
              item._sum.amount ||
                0
            ),
          })
        );

      /*
      |--------------------------------------------------------------------------
      | INCOME BY CATEGORY
      |--------------------------------------------------------------------------
      */

      const incomeByCategory =
        categoriesIncome.map(
          (item) => ({
            categoryId:
              item.categoryId,

            categoryName:
              categoryMap.get(
                item.categoryId
              ) ||
              'Tanpa Kategori',

            amount: Number(
              item._sum.amount ||
                0
            ),
          })
        );

      /*
      |--------------------------------------------------------------------------
      | ACCOUNT SUMMARY
      |--------------------------------------------------------------------------
      */

      const accountSummary =
        accounts.map(
          (account) => ({
            id: account.id,

            name: account.name,

            type: account.type,

            balance: Number(
              account.currentBalance ||
                0
            ),
          })
        );

      /*
      |--------------------------------------------------------------------------
      | TOTAL ACCOUNT BALANCE
      |--------------------------------------------------------------------------
      */

      const totalAccountBalance =
        accountSummary.reduce(
          (
            total,
            account
          ) =>
            total +
            account.balance,
          0
        );

      /*
      |--------------------------------------------------------------------------
      | EXPENSE BY ACCOUNT
      |--------------------------------------------------------------------------
      */

      const expenseAccountIds =
        expenseByAccountGrouped
          .map(
            (item) =>
              item.accountId
          )
          .filter(Boolean);

      const expenseAccounts =
        expenseAccountIds.length >
        0
          ? await prisma.account.findMany(
              {
                where: {
                  tenantId,

                  isActive: true,

                  id: {
                    in: [
                      ...new Set(
                        expenseAccountIds
                      ),
                    ],
                  },

                  /*
                   * Extra safety untuk MEMBER.
                   */
                  ...accountWhere,
                },

                select: {
                  id: true,
                  name: true,
                },
              }
            )
          : [];

      const expenseAccountMap =
        new Map(
          expenseAccounts.map(
            (account) => [
              account.id,
              account.name,
            ]
          )
        );

      const expenseByAccount =
        expenseByAccountGrouped.map(
          (item) => ({
            accountId:
              item.accountId,

            accountName:
              expenseAccountMap.get(
                item.accountId
              ) ||
              'Rekening',

            amount: Number(
              item._sum.amount ||
                0
            ),
          })
        );

      /*
      |--------------------------------------------------------------------------
      | BUDGET
      |--------------------------------------------------------------------------
      */

      const enrichedBudgets =
        await Promise.all(
          budgets.map(
            async (budget) => {
              const [
                year,
                month,
              ] =
                budget.period
                  .split('-')
                  .map(Number);

              const start =
                new Date(
                  year,
                  month - 1,
                  1
                );

              start.setHours(
                0,
                0,
                0,
                0
              );

              const end =
                new Date(
                  year,
                  month,
                  0
                );

              end.setHours(
                23,
                59,
                59,
                999
              );

              const usedResult =
                await prisma.transaction.aggregate(
                  {
                    where: {
                      tenantId,

                      type: 'EXPENSE',

                      categoryId:
                        budget.categoryId,

                      date: {
                        gte: start,
                        lte: end,
                      },

                      ...accountFilter,
                    },

                    _sum: {
                      amount: true,
                    },
                  }
                );

              const amount =
                Number(
                  budget.amount ||
                    0
                );

              const used =
                Number(
                  usedResult
                    ._sum
                    .amount ||
                    0
                );

              const remaining =
                amount - used;

              const percentage =
                amount > 0
                  ? (used /
                      amount) *
                    100
                  : 0;

              let status =
                'AMAN';

              if (
                percentage > 100
              ) {
                status =
                  'MELEBIHI_BUDGET';
              } else if (
                percentage >=
                90
              ) {
                status =
                  'HAMPIR_HABIS';
              } else if (
                percentage >=
                70
              ) {
                status =
                  'PERHATIAN';
              }

              return {
                id: budget.id,

                period:
                  budget.period,

                categoryId:
                  budget.categoryId,

                categoryName:
                  budget.category
                    ?.name ||
                  '-',

                name:
                  budget.category
                    ?.name ||
                  'Budget',

                amount,

                limit: amount,

                used,

                remaining,

                percentage:
                  Math.round(
                    percentage *
                      100
                  ) / 100,

                status,
              };
            }
          )
        );

      /*
      |--------------------------------------------------------------------------
      | FINANCIAL GOALS
      |--------------------------------------------------------------------------
      */

      const enrichedGoals =
        goals.map(
          (goal) => {
            const targetAmount =
              Number(
                goal.targetAmount ||
                  0
              );

            const currentAmount =
              Number(
                goal.currentAmount ||
                  0
              );

            const progress =
              targetAmount > 0
                ? (currentAmount /
                    targetAmount) *
                  100
                : 0;

            return {
              id: goal.id,

              name: goal.name,

              targetAmount,

              target:
                targetAmount,

              currentAmount,

              saved:
                currentAmount,

              progressPercentage:
                Math.round(
                  progress *
                    100
                ) / 100,

              shortfall:
                Math.max(
                  targetAmount -
                    currentAmount,
                  0
                ),

              isCompleted:
                currentAmount >=
                targetAmount,

              targetDate:
                goal.targetDate,

              account:
                goal.account
                  ? {
                      id:
                        goal.account
                          .id,

                      name:
                        goal.account
                          .name,
                    }
                  : null,
            };
          }
        );

      /*
      |--------------------------------------------------------------------------
      | RECENT TRANSACTIONS
      |--------------------------------------------------------------------------
      */

      const formattedRecentTransactions =
        recentTransactions.map(
          (transaction) => ({
            id:
              transaction.id,

            date:
              transaction.date,

            type:
              transaction.type,

            amount: Number(
              transaction.amount ||
                0
            ),

            note:
              transaction.note ||
              '',

            description:
              transaction.note ||
              '',

            category:
              transaction.category
                ? {
                    id:
                      transaction
                        .category
                        .id,

                    name:
                      transaction
                        .category
                        .name,

                    type:
                      transaction
                        .category
                        .type,
                  }
                : null,

            account:
              transaction.account
                ? {
                    id:
                      transaction
                        .account
                        .id,

                    name:
                      transaction
                        .account
                        .name,

                    type:
                      transaction
                        .account
                        .type,
                  }
                : null,

            user:
              transaction.user
                ? {
                    id:
                      transaction
                        .user
                        .id,

                    name:
                      transaction
                        .user
                        .name,
                  }
                : null,
          })
        );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      res.json({
        /*
        |--------------------------------------------------------------------------
        | KPI
        |--------------------------------------------------------------------------
        */

        totalSaldo:
          totalAccountBalance,

        totalIncome,

        totalExpense,

        cashFlow,

        /*
        |--------------------------------------------------------------------------
        | SUMMARY
        |--------------------------------------------------------------------------
        */

        summary: {
          totalIncome,

          totalExpense,

          balance:
            cashFlow,

          cashFlow,

          transactionCount,

          totalAccountBalance,

          accountCount:
            accounts.length,
        },

        /*
        |--------------------------------------------------------------------------
        | ACCOUNTS
        |--------------------------------------------------------------------------
        */

        accounts:
          accountSummary,

        /*
        |--------------------------------------------------------------------------
        | RECENT TRANSACTIONS
        |--------------------------------------------------------------------------
        */

        recentTransactions:
          formattedRecentTransactions,

        /*
        |--------------------------------------------------------------------------
        | CHART
        |--------------------------------------------------------------------------
        */

        expenseByCategory,

        incomeByCategory,

        expenseByAccount,

        /*
        |--------------------------------------------------------------------------
        | BUDGET
        |--------------------------------------------------------------------------
        */

        budgets:
          enrichedBudgets,

        /*
        |--------------------------------------------------------------------------
        | GOALS
        |--------------------------------------------------------------------------
        */

        savingGoals:
          enrichedGoals,

        goals:
          enrichedGoals,

        /*
        |--------------------------------------------------------------------------
        | STATISTICS
        |--------------------------------------------------------------------------
        */

        statistics: {
          categoryCount,

          transactionCount,

          budgetCount,
        },

        /*
        |--------------------------------------------------------------------------
        | FILTERS
        |--------------------------------------------------------------------------
        */

        filters: {
          period,

          startDate:
            startDate || null,

          endDate:
            endDate || null,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| REPORT - INCOME
|--------------------------------------------------------------------------
| GET /api/reports/income
|--------------------------------------------------------------------------
*/

const reportIncome =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        req.tenantId;

      const {
        startDate,
        endDate,
      } = req.query;

      let dateFilter;

      try {
        dateFilter =
          getDateFilter(
            startDate,
            endDate
          );
      } catch (error) {
        return res.status(400).json({
          message:
            error.message,
        });
      }

      const accountFilter =
        await getAllowedAccountFilter(
          req
        );

      const result =
        await prisma.transaction.aggregate(
          {
            where: {
              tenantId,

              type: 'INCOME',

              ...accountFilter,

              ...dateFilter,
            },

            _sum: {
              amount: true,
            },

            _count: {
              id: true,
            },
          }
        );

      res.json({
        type: 'INCOME',

        total: Number(
          result._sum.amount ||
            0
        ),

        transactionCount:
          result._count.id,

        filters: {
          startDate:
            startDate || null,

          endDate:
            endDate || null,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| REPORT - EXPENSE
|--------------------------------------------------------------------------
| GET /api/reports/expense
|--------------------------------------------------------------------------
*/

const reportExpense =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        req.tenantId;

      const {
        startDate,
        endDate,
      } = req.query;

      let dateFilter;

      try {
        dateFilter =
          getDateFilter(
            startDate,
            endDate
          );
      } catch (error) {
        return res.status(400).json({
          message:
            error.message,
        });
      }

      const accountFilter =
        await getAllowedAccountFilter(
          req
        );

      const result =
        await prisma.transaction.aggregate(
          {
            where: {
              tenantId,

              type: 'EXPENSE',

              ...accountFilter,

              ...dateFilter,
            },

            _sum: {
              amount: true,
            },

            _count: {
              id: true,
            },
          }
        );

      res.json({
        type: 'EXPENSE',

        total: Number(
          result._sum.amount ||
            0
        ),

        transactionCount:
          result._count.id,

        filters: {
          startDate:
            startDate || null,

          endDate:
            endDate || null,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| REPORT - CASHFLOW
|--------------------------------------------------------------------------
| GET /api/reports/cashflow
|--------------------------------------------------------------------------
*/

const reportCashflow =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        req.tenantId;

      const {
        startDate,
        endDate,
      } = req.query;

      let dateFilter;

      try {
        dateFilter =
          getDateFilter(
            startDate,
            endDate
          );
      } catch (error) {
        return res.status(400).json({
          message:
            error.message,
        });
      }

      const accountFilter =
        await getAllowedAccountFilter(
          req
        );

      const [
        income,
        expense,
      ] =
        await Promise.all([
          prisma.transaction.aggregate(
            {
              where: {
                tenantId,

                type: 'INCOME',

                ...accountFilter,

                ...dateFilter,
              },

              _sum: {
                amount: true,
              },
            }
          ),

          prisma.transaction.aggregate(
            {
              where: {
                tenantId,

                type: 'EXPENSE',

                ...accountFilter,

                ...dateFilter,
              },

              _sum: {
                amount: true,
              },
            }
          ),
        ]);

      const totalIncome =
        Number(
          income._sum.amount ||
            0
        );

      const totalExpense =
        Number(
          expense._sum.amount ||
            0
        );

      res.json({
        totalIncome,

        totalExpense,

        cashflow:
          totalIncome -
          totalExpense,

        filters: {
          startDate:
            startDate || null,

          endDate:
            endDate || null,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| REPORT - TOP EXPENSE CATEGORY
|--------------------------------------------------------------------------
| GET /api/reports/top-expense-category
|--------------------------------------------------------------------------
*/

const reportTopExpenseCategory =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        req.tenantId;

      const {
        startDate,
        endDate,
      } = req.query;

      let dateFilter;

      try {
        dateFilter =
          getDateFilter(
            startDate,
            endDate
          );
      } catch (error) {
        return res.status(400).json({
          message:
            error.message,
        });
      }

      const accountFilter =
        await getAllowedAccountFilter(
          req
        );

      const grouped =
        await prisma.transaction.groupBy(
          {
            by: [
              'categoryId',
            ],

            where: {
              tenantId,

              type: 'EXPENSE',

              categoryId: {
                not: null,
              },

              ...accountFilter,

              ...dateFilter,
            },

            _sum: {
              amount: true,
            },

            orderBy: {
              _sum: {
                amount: 'desc',
              },
            },

            take: 10,
          }
        );

      const categoryIds =
        grouped
          .map(
            (item) =>
              item.categoryId
          )
          .filter(Boolean);

      const categories =
        categoryIds.length > 0
          ? await prisma.category.findMany(
              {
                where: {
                  tenantId,

                  id: {
                    in: categoryIds,
                  },
                },

                select: {
                  id: true,
                  name: true,
                },
              }
            )
          : [];

      const categoryMap =
        new Map(
          categories.map(
            (category) => [
              category.id,
              category.name,
            ]
          )
        );

      res.json({
        data: grouped.map(
          (item) => ({
            categoryId:
              item.categoryId,

            categoryName:
              categoryMap.get(
                item.categoryId
              ) ||
              'Tanpa Kategori',

            amount: Number(
              item._sum.amount ||
                0
            ),
          })
        ),

        filters: {
          startDate:
            startDate || null,

          endDate:
            endDate || null,
        },
      });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  getDashboard,

  getAllowedAccountFilter,

  getAllowedAccountWhere,

  reportIncome,

  reportExpense,

  reportCashflow,

  reportTopExpenseCategory,
};
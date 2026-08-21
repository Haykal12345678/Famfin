const asyncHandler = require('express-async-handler');
const { Parser } = require('json2csv');
const prisma = require('../utils/prisma');
const {
  getAllowedAccountFilter,
} = require('./report.controller');

const TRANSACTION_TYPES = [
  'INCOME',
  'EXPENSE',
];

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
| GET /api/export/transactions
|--------------------------------------------------------------------------
|
| Query:
|
| ?startDate=YYYY-MM-DD
| &endDate=YYYY-MM-DD
| &type=INCOME|EXPENSE
| &categoryId=...
| &accountId=...
|
|--------------------------------------------------------------------------
|
| OWNER / ADMIN
| -> dapat export transaksi dari seluruh
|    ACCOUNT AKTIF tenant
|
| MEMBER / VIEWER
| -> hanya transaksi dari ACCOUNT AKTIF
|    yang memiliki canView = true
|
|--------------------------------------------------------------------------
*/

const exportTransactions = asyncHandler(
  async (req, res) => {
    const tenantId = req.tenantId;
    const membership = req.membership;

    /*
    |--------------------------------------------------------------------------
    | Tenant / Membership validation
    |--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | Query
    |--------------------------------------------------------------------------
    */

    const {
      startDate,
      endDate,
      type,
      categoryId,
      accountId,
    } = req.query;

    /*
    |--------------------------------------------------------------------------
    | Validate transaction type
    |--------------------------------------------------------------------------
    */

    if (
      type &&
      !TRANSACTION_TYPES.includes(type)
    ) {
      return res.status(400).json({
        message:
          'Jenis transaksi tidak valid.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate date range
    |--------------------------------------------------------------------------
    */

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      return res.status(400).json({
        message:
          'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.',
      });
    }

    let dateFilter = {};

    /*
    |--------------------------------------------------------------------------
    | Start Date
    |--------------------------------------------------------------------------
    */

    if (startDate) {
      const start = new Date(
        `${startDate}T00:00:00`
      );

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          message:
            'Format startDate tidak valid.',
        });
      }

      dateFilter.gte = start;
    }

    /*
    |--------------------------------------------------------------------------
    | End Date
    |--------------------------------------------------------------------------
    */

    if (endDate) {
      const end = new Date(
        `${endDate}T23:59:59.999`
      );

      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message:
            'Format endDate tidak valid.',
        });
      }

      dateFilter.lte = end;
    }

    /*
    |--------------------------------------------------------------------------
    | Account Permission
    |--------------------------------------------------------------------------
    |
    | OWNER / ADMIN
    | -> seluruh account aktif tenant
    |
    | MEMBER / VIEWER
    | -> account aktif + canView = true
    |
    |--------------------------------------------------------------------------
    */

    const accountFilter =
      await getAllowedAccountFilter(req);

    /*
    |--------------------------------------------------------------------------
    | Base WHERE
    |--------------------------------------------------------------------------
    */

    const where = {
      tenantId,

      /*
       * Hanya transaksi yang berasal
       * dari account aktif.
       *
       * Ini penting supaya transaksi dari
       * rekening nonaktif tidak ikut export.
       */
      account: {
        isActive: true,
        ...accountFilter,
      },

      ...(type
        ? {
            type,
          }
        : {}),

      ...(categoryId
        ? {
            categoryId,
          }
        : {}),

      ...(Object.keys(dateFilter).length > 0
        ? {
            date: dateFilter,
          }
        : {}),
    };

    /*
    |--------------------------------------------------------------------------
    | Account ID Filter
    |--------------------------------------------------------------------------
    |
    | Jangan langsung:
    |
    | where.accountId = accountId
    |
    | tanpa validasi.
    |
    | Account harus:
    |
    | 1. Milik tenant
    | 2. Aktif
    | 3. Boleh dilihat user
    |
    |--------------------------------------------------------------------------
    */

    if (accountId) {
      const accountAllowed =
        await prisma.account.findFirst({
          where: {
            id: accountId,
            tenantId,
            isActive: true,
            ...accountFilter,
          },
        });

      if (!accountAllowed) {
        return res.status(403).json({
          message:
            'Anda tidak memiliki akses ke rekening tersebut.',
        });
      }

      where.accountId = accountId;
    }

    /*
    |--------------------------------------------------------------------------
    | Category Validation
    |--------------------------------------------------------------------------
    */

    if (categoryId) {
      const category =
        await prisma.category.findFirst({
          where: {
            id: categoryId,
            tenantId,
          },
        });

      if (!category) {
        return res.status(404).json({
          message:
            'Kategori tidak ditemukan.',
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Get Transactions
    |--------------------------------------------------------------------------
    */

    const items =
      await prisma.transaction.findMany({
        where,

        include: {
          category: true,

          account: true,

          user: {
            select: {
              name: true,
            },
          },
        },

        orderBy: {
          date: 'desc',
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Convert Transaction -> CSV Row
    |--------------------------------------------------------------------------
    */

    const rows = items.map(
      (transaction) => ({
        tanggal:
          transaction.date
            .toISOString()
            .slice(0, 10),

        jenis:
          transaction.type,

        kategori:
          transaction.category?.name ||
          '-',

        rekening:
          transaction.account?.name ||
          '-',

        nominal:
          Number(transaction.amount),

        catatan:
          transaction.note || '',

        user:
          transaction.user?.name ||
          '-',
      })
    );

    /*
    |--------------------------------------------------------------------------
    | CSV Parser
    |--------------------------------------------------------------------------
    */

    const parser = new Parser({
      fields: [
        'tanggal',
        'jenis',
        'kategori',
        'rekening',
        'nominal',
        'catatan',
        'user',
      ],
    });

    const csv = parser.parse(rows);

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    res.header(
      'Content-Type',
      'text/csv; charset=utf-8'
    );

    res.attachment(
      `transaksi-${Date.now()}.csv`
    );

    return res.send(csv);
  }
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  exportTransactions,
};
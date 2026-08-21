const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(membership?.role);
};


/*
|--------------------------------------------------------------------------
| GET /api/audit-logs
|
| Query:
| ?module=
| ?userId=
| ?action=
| ?startDate=
| ?endDate=
| ?page=
| ?pageSize=
|
| OWNER / ADMIN
|   -> boleh melihat audit log tenant
|
| MEMBER / VIEWER
|   -> forbidden
|--------------------------------------------------------------------------
*/

const listAuditLogs = asyncHandler(async (req, res) => {
  const {
    module,
    userId,
    action,
    startDate,
    endDate,
    page = 1,
    pageSize = 30,
  } = req.query;

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
      message: 'Hanya Owner atau Admin yang dapat melihat Audit Log.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Pagination validation
  |--------------------------------------------------------------------------
  */

  let currentPage = Number(page);
  let currentPageSize = Number(pageSize);

  if (!Number.isInteger(currentPage) || currentPage < 1) {
    currentPage = 1;
  }

  if (!Number.isInteger(currentPageSize) || currentPageSize < 1) {
    currentPageSize = 30;
  }

  /*
  | Maksimal 100 data per request
  | supaya endpoint tidak dibebani request besar.
  */

  if (currentPageSize > 100) {
    currentPageSize = 100;
  }

  /*
  |--------------------------------------------------------------------------
  | Build WHERE
  |--------------------------------------------------------------------------
  */

  const where = {
    tenantId,
  };

  /*
  |--------------------------------------------------------------------------
  | Module filter
  |--------------------------------------------------------------------------
  */

  if (module && String(module).trim()) {
    where.module = String(module).trim();
  }

  /*
  |--------------------------------------------------------------------------
  | User filter
  |--------------------------------------------------------------------------
  */

  if (userId && String(userId).trim()) {
    /*
     * Pastikan user yang difilter memang bagian
     * dari tenant aktif.
     *
     * Ini mencegah query lintas tenant.
     */

    const targetMembership = await prisma.membership.findFirst({
      where: {
        tenantId,
        userId: String(userId).trim(),
        status: 'ACTIVE',
      },
    });

    if (!targetMembership) {
      return res.status(404).json({
        message: 'User tidak ditemukan dalam keluarga ini.',
      });
    }

    where.userId = String(userId).trim();
  }

  /*
  |--------------------------------------------------------------------------
  | Action filter
  |--------------------------------------------------------------------------
  */

  const allowedActions = [
    'CREATE',
    'UPDATE',
    'DELETE',
  ];

  if (action && String(action).trim()) {
    const normalizedAction = String(action).trim().toUpperCase();

    if (!allowedActions.includes(normalizedAction)) {
      return res.status(400).json({
        message: 'Action audit log tidak valid.',
      });
    }

    where.action = normalizedAction;
  }

  /*
  |--------------------------------------------------------------------------
  | Date filter
  |--------------------------------------------------------------------------
  */

  if (startDate || endDate) {
    where.timestamp = {};

    /*
     * startDate = awal hari
     */

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          message: 'Format startDate tidak valid.',
        });
      }

      where.timestamp.gte = start;
    }

    /*
     * endDate = akhir hari
     */

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);

      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: 'Format endDate tidak valid.',
        });
      }

      where.timestamp.lte = end;
    }

    /*
     * Pastikan range masuk akal.
     */

    if (
      where.timestamp.gte &&
      where.timestamp.lte &&
      where.timestamp.gte > where.timestamp.lte
    ) {
      return res.status(400).json({
        message: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.',
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Query
  |--------------------------------------------------------------------------
  */

  const skip = (currentPage - 1) * currentPageSize;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,

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
        timestamp: 'desc',
      },

      skip,
      take: currentPageSize,
    }),

    prisma.auditLog.count({
      where,
    }),
  ]);

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  res.json({
    items,
    total,

    page: currentPage,

    pageSize: currentPageSize,

    totalPages: Math.ceil(total / currentPageSize),
  });
});


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  listAuditLogs,
};
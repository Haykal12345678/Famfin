const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

// GET /api/audit-logs?module=&userId=&page=&pageSize= (Owner/Admin only)
const listAuditLogs = asyncHandler(async (req, res) => {
  const { module, userId, page = 1, pageSize = 30 } = req.query;

  const where = { tenantId: req.tenantId, ...(module && { module }), ...(userId && { userId }) };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'desc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
});

module.exports = { listAuditLogs };

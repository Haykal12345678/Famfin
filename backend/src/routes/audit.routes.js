const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireRole } = require('../middleware/permission');
const { listAuditLogs } = require('../controllers/audit.controller');

router.use(requireAuth, requireTenant, requireRole('OWNER', 'ADMIN'));
router.get('/', listAuditLogs);

module.exports = router;

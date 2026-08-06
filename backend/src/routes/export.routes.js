const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');
const { exportTransactions } = require('../controllers/export.controller');

router.use(requireAuth, requireTenant);
router.get('/transactions', requireCapability('export_report'), exportTransactions);

module.exports = router;

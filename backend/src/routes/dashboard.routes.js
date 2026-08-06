const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { getDashboard } = require('../controllers/report.controller');

router.use(requireAuth, requireTenant);
router.get('/', getDashboard);

module.exports = router;

const router = require('express').Router();

const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const reportController = require('../controllers/report.controller');

router.use(requireAuth);
router.use(requireTenant);

router.get('/', reportController.getDashboard);

module.exports = router;
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireRole } = require('../middleware/permission');
const { listMyTenants, createTenant, updateTenant, deactivateTenant } = require('../controllers/tenant.controller');

router.use(requireAuth);

router.get('/', listMyTenants);
router.post('/', createTenant);
router.patch('/current', requireTenant, requireRole('OWNER'), updateTenant);
router.patch('/current/deactivate', requireTenant, requireRole('OWNER'), deactivateTenant);

module.exports = router;

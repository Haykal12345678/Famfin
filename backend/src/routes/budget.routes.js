const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');
const { listBudgets, createBudget, updateBudget, deleteBudget } = require('../controllers/budget.controller');

router.use(requireAuth, requireTenant);

router.get('/', listBudgets);
router.post('/', requireCapability('manage_budget'), createBudget);
router.patch('/:id', requireCapability('manage_budget'), updateBudget);
router.delete('/:id', requireCapability('manage_budget'), deleteBudget);

module.exports = router;

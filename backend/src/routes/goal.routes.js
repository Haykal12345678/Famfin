const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');
const { listGoals, createGoal, contributeGoal, deleteGoal, updateGoal } = require('../controllers/goal.controller');

router.use(requireAuth, requireTenant);

router.get('/', listGoals);
router.post('/', createGoal);
router.patch('/:id/contribute', contributeGoal);
router.patch('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');
const { listCategories, createCategory, updateCategory, deactivateCategory } = require('../controllers/category.controller');

router.use(requireAuth, requireTenant);

router.get('/', listCategories);
router.post('/', requireCapability('manage_categories'), createCategory);
router.patch('/:id', requireCapability('manage_categories'), updateCategory);
router.delete('/:id', requireCapability('manage_categories'), deactivateCategory);

module.exports = router;

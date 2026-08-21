const router = require('express').Router();

const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');

const {
  listCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
} = require('../controllers/category.controller');


/*
|--------------------------------------------------------------------------
| AUTH + TENANT
|--------------------------------------------------------------------------
*/

router.use(
  requireAuth,
  requireTenant
);


/*
|--------------------------------------------------------------------------
| GET /api/categories
|
| Default:
| hanya kategori aktif
|
| OWNER / ADMIN:
| /api/categories?includeInactive=true
| -> aktif + nonaktif
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  listCategories
);


/*
|--------------------------------------------------------------------------
| POST /api/categories
|
| Create category
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  requireCapability('manage_categories'),
  createCategory
);


/*
|--------------------------------------------------------------------------
| PATCH /api/categories/:id
|
| Update category
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id',
  requireCapability('manage_categories'),
  updateCategory
);


/*
|--------------------------------------------------------------------------
| DELETE /api/categories/:id
|
| Deactivate category
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id',
  requireCapability('manage_categories'),
  deactivateCategory
);


/*
|--------------------------------------------------------------------------
| PATCH /api/categories/:id/activate
|
| Activate category kembali
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/activate',
  requireCapability('manage_categories'),
  activateCategory
);


module.exports = router;
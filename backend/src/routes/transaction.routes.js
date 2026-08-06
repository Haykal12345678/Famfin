const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireAccountAccess } = require('../middleware/permission');
const {
  createIncome, createExpense, createTransfer, cancelTransfer, listTransactions,
} = require('../controllers/transaction.controller');

router.use(requireAuth, requireTenant);

router.get('/', listTransactions);
router.post('/income', requireAccountAccess('accountId', 'create'), createIncome);
router.post('/expense', requireAccountAccess('accountId', 'create'), createExpense);
router.post('/transfer', createTransfer); // validasi akses ganda dilakukan di dalam controller
router.delete('/transfer/:transferGroupId', cancelTransfer);

module.exports = router;

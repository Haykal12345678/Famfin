const router = require('express').Router();

const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');

const {
  reportIncome,
  reportExpense,
  reportCashflow,
  reportTopExpenseCategory,
} = require('../controllers/report.controller');

router.use(requireAuth, requireTenant);

router.get('/income', reportIncome);
router.get('/expense', reportExpense);
router.get('/cashflow', reportCashflow);
router.get('/top-expense-category', reportTopExpenseCategory);

module.exports = router;
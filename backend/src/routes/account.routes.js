const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');
const { listAccounts, createAccount, updateAccount, deactivateAccount } = require('../controllers/account.controller');
const { listAccountAccess, setAccountAccess } = require('../controllers/accountAccess.controller');

router.use(requireAuth, requireTenant);

router.get('/', listAccounts);
router.post('/', requireCapability('manage_accounts'), createAccount);
router.patch('/:id', requireCapability('manage_accounts'), updateAccount);
router.delete('/:id', requireCapability('manage_accounts'), deactivateAccount);

router.get('/:accountId/access', requireCapability('manage_accounts'), listAccountAccess);
router.put('/:accountId/access/:userId', requireCapability('manage_accounts'), setAccountAccess);

module.exports = router;

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const { requireCapability } = require('../middleware/permission');
const { listMembers, createMember, updateMemberRole, removeMember } = require('../controllers/user.controller');

router.use(requireAuth, requireTenant);

router.get('/', listMembers);
router.post('/', requireCapability('manage_users'), createMember);
router.patch('/:membershipId/role', requireCapability('manage_users'), updateMemberRole);
router.delete('/:membershipId', requireCapability('manage_users'), removeMember);

module.exports = router;

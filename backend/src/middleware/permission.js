const prisma = require('../utils/prisma');

// Hak akses default per role untuk operasi umum (di luar akses rekening spesifik)
const ROLE_CAPABILITIES = {
  OWNER: ['manage_users', 'manage_accounts', 'manage_categories', 'manage_budget', 'manage_goal', 'view_report', 'export_report', 'manage_transaction'],
  ADMIN: ['manage_users', 'manage_accounts', 'manage_categories', 'manage_budget', 'manage_goal', 'view_report', 'export_report', 'manage_transaction'],
  MEMBER: ['manage_transaction', 'view_report'],
  VIEWER: ['view_report'],
};

/**
 * Membatasi endpoint hanya untuk role tertentu dalam tenant aktif.
 * Contoh: requireRole('OWNER', 'ADMIN')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return res.status(403).json({ message: 'Role Anda tidak memiliki izin untuk aksi ini.' });
    }
    next();
  };
}

/**
 * Membatasi endpoint berdasarkan capability role (mis. 'manage_accounts').
 * Backend selalu menjadi sumber kebenaran; frontend hanya menyembunyikan menu untuk UX.
 */
function requireCapability(capability) {
  return (req, res, next) => {
    const role = req.membership?.role;
    if (!role || !ROLE_CAPABILITIES[role]?.includes(capability)) {
      return res.status(403).json({ message: 'Anda tidak memiliki permission untuk aksi ini.' });
    }
    next();
  };
}

/**
 * Memvalidasi akses user ke rekening spesifik (Account Access Management).
 * level: 'view' | 'create' | 'edit' | 'delete' | 'manage'
 * Owner selalu memiliki akses penuh ke semua rekening tenant.
 */
function requireAccountAccess(accountIdParam, level) {
  return async (req, res, next) => {
    try {
      const accountId = req.params[accountIdParam] || req.body[accountIdParam];
      if (!accountId) return res.status(400).json({ message: 'accountId wajib diisi.' });

      const account = await prisma.account.findFirst({ where: { id: accountId, tenantId: req.tenantId } });
      if (!account) return res.status(404).json({ message: 'Rekening tidak ditemukan.' });

      if (req.membership.role === 'OWNER') {
        req.account = account;
        return next();
      }

      const access = await prisma.accountAccess.findUnique({
        where: { accountId_userId: { accountId, userId: req.user.id } },
      });

      const levelField = {
        view: 'canView',
        create: 'canCreateTx',
        edit: 'canEditTx',
        delete: 'canDeleteTx',
        manage: 'canManage',
      }[level];

      if (!access || !access[levelField]) {
        return res.status(403).json({ message: 'Anda tidak memiliki akses ke rekening ini.' });
      }

      req.account = account;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, requireCapability, requireAccountAccess, ROLE_CAPABILITIES };

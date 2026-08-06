const prisma = require('./prisma');

/**
 * Mencatat aktivitas user ke Audit Log.
 * Dipanggil setiap ada CREATE / UPDATE / DELETE pada data penting
 * (Transaction, Account, Category, Budget, FinancialGoal, Membership, dll).
 */
async function writeAudit({ tenantId, userId, action, module, recordId, oldValue = null, newValue = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        module,
        recordId,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
      },
    });
  } catch (err) {
    // Audit log tidak boleh menggagalkan transaksi utama, cukup log ke console.
    console.error('Gagal menulis audit log:', err.message);
  }
}

module.exports = { writeAudit };

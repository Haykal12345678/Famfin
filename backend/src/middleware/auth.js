const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

/**
 * Memverifikasi JWT dari header Authorization: Bearer <token>
 * dan menempelkan req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login kembali.' });
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ message: 'User tidak ditemukan.' });
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
}

module.exports = { requireAuth };

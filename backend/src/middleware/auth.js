const crypto = require('crypto');

const {
  verifyToken,
} = require('../utils/jwt');

const prisma =
  require('../utils/prisma');

/*
|--------------------------------------------------------------------------
| SESSION CONFIGURATION
|--------------------------------------------------------------------------
|
| User dianggap aktif selama masih melakukan request.
|
| 1 jam tidak ada request
|        ↓
| Session expired
|        ↓
| API mengembalikan 401
|        ↓
| Frontend logout
|
*/

const IDLE_TIMEOUT_MS =
  60 * 60 * 1000; // 1 jam

/*
|--------------------------------------------------------------------------
| Require Auth
|--------------------------------------------------------------------------
*/

async function requireAuth(
  req,
  res,
  next
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Authorization Header
    |--------------------------------------------------------------------------
    */

    const header =
      req.headers.authorization || '';

    const token =
      header.startsWith('Bearer ')
        ? header.slice(7)
        : null;

    if (!token) {
      return res.status(401).json({
        message:
          'Token tidak ditemukan. Silakan login kembali.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify JWT
    |--------------------------------------------------------------------------
    */

    const decoded =
      verifyToken(token);

    if (!decoded?.userId) {
      return res.status(401).json({
        message:
          'Token tidak valid. Silakan login kembali.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get User
    |--------------------------------------------------------------------------
    */

    const user =
      await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
      });

    if (!user) {
      return res.status(401).json({
        message:
          'User tidak ditemukan.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Session ID
    |--------------------------------------------------------------------------
    |
    | Token harus mempunyai jti.
    |
    */

    const tokenId =
      decoded.jti;

    /*
    |--------------------------------------------------------------------------
    | Backward Compatibility
    |--------------------------------------------------------------------------
    |
    | Kalau JWT lama belum mempunyai jti,
    | jangan langsung error aneh.
    |
    */

    if (!tokenId) {
      return res.status(401).json({
        message:
          'Session tidak valid. Silakan login kembali.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Session
    |--------------------------------------------------------------------------
    */

    const session =
      await prisma.userSession.findUnique({
        where: {
          tokenId,
        },
      });

    if (!session) {
      return res.status(401).json({
        message:
          'Session tidak ditemukan. Silakan login kembali.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Session Owner
    |--------------------------------------------------------------------------
    */

    if (
      session.userId !==
      user.id
    ) {
      return res.status(401).json({
        message:
          'Session tidak valid.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check JWT Expiration
    |--------------------------------------------------------------------------
    */

    if (
      decoded.exp &&
      decoded.exp * 1000 <= Date.now()
    ) {
      await prisma.userSession.deleteMany({
        where: {
          tokenId,
        },
      });

      return res.status(401).json({
        message:
          'Session telah kedaluwarsa. Silakan login kembali.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Idle Timeout
    |--------------------------------------------------------------------------
    */

    const now =
      Date.now();

    const lastActivity =
      new Date(
        session.lastActivity
      ).getTime();

    const idleTime =
      now - lastActivity;

    if (
      idleTime >=
      IDLE_TIMEOUT_MS
    ) {
      /*
      |--------------------------------------------------------------------------
      | Delete Expired Session
      |--------------------------------------------------------------------------
      */

      await prisma.userSession.deleteMany({
        where: {
          tokenId,
        },
      });

      return res.status(401).json({
        message:
          'Session berakhir karena tidak ada aktivitas selama 1 jam.',
        code:
          'IDLE_SESSION_EXPIRED',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update Last Activity
    |--------------------------------------------------------------------------
    |
    | Setiap request authenticated dianggap sebagai aktivitas.
    |
    */

    await prisma.userSession.update({
      where: {
        tokenId,
      },

      data: {
        lastActivity:
          new Date(),
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Attach User
    |--------------------------------------------------------------------------
    */

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    /*
    |--------------------------------------------------------------------------
    | Attach Session
    |--------------------------------------------------------------------------
    */

    req.session = {
      id: session.id,
      tokenId: session.tokenId,
      lastActivity:
        session.lastActivity,
    };

    /*
    |--------------------------------------------------------------------------
    | Continue
    |--------------------------------------------------------------------------
    */

    next();
  } catch (err) {
    console.error(
      'AUTH ERROR:',
      err
    );

    return res.status(401).json({
      message:
        'Token tidak valid atau kedaluwarsa.',
    });
  }
}

module.exports = {
  requireAuth,
};

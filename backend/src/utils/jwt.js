const jwt = require('jsonwebtoken');

/*
|--------------------------------------------------------------------------
| JWT CONFIGURATION
|--------------------------------------------------------------------------
|
| JWT tetap memiliki expiration sebagai batas maksimum keamanan.
| Idle timeout ditangani oleh session middleware.
|
*/

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || '7d';

/*
|--------------------------------------------------------------------------
| Sign Token
|--------------------------------------------------------------------------
*/

function signToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/*
|--------------------------------------------------------------------------
| Verify Token
|--------------------------------------------------------------------------
*/

function verifyToken(token) {
  return jwt.verify(
    token,
    process.env.JWT_SECRET
  );
}

module.exports = {
  signToken,
  verifyToken,
};

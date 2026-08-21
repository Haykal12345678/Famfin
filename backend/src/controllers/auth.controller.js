const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');

const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_ROLES = [
  'OWNER',
  'ADMIN',
  'MEMBER',
  'VIEWER',
];

/*
|--------------------------------------------------------------------------
| SESSION CONFIG
|--------------------------------------------------------------------------
|
| Session maksimal 7 hari.
|
| Idle timeout 1 jam ditangani oleh requireAuth.js
| berdasarkan lastActivity.
|
|--------------------------------------------------------------------------
*/

const SESSION_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function sanitizeTenant(tenant, membership) {
  return {
    id: tenant.id,
    name: tenant.name,
    role: membership.role,
  };
}

/*
|--------------------------------------------------------------------------
| CREATE SESSION
|--------------------------------------------------------------------------
|
| Membuat:
|
| 1. tokenId / JTI
| 2. JWT
| 3. UserSession
|
|--------------------------------------------------------------------------
*/

async function createUserSession(userId) {
  const tokenId = crypto.randomUUID();

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() +
      SESSION_DURATION_MS
  );

  const token = signToken({
    userId,
    jti: tokenId,
  });

  await prisma.userSession.create({
    data: {
      userId,
      tokenId,
      lastActivity: now,
      expiresAt,
    },
  });

  return {
    token,
    tokenId,
    expiresAt,
  };
}

/*
|--------------------------------------------------------------------------
| POST /api/auth/register
|--------------------------------------------------------------------------
*/

const register = asyncHandler(
  async (req, res) => {
    const {
      name,
      email,
      password,
      confirmPassword,
      familyName,
    } = req.body;

    const cleanName =
      String(name || '').trim();

    const cleanEmail =
      normalizeEmail(email);

    const cleanFamilyName =
      String(familyName || '').trim();

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword ||
      !cleanFamilyName
    ) {
      return res.status(400).json({
        message:
          'Semua field wajib diisi.',
      });
    }

    if (
      cleanName.length < 2 ||
      cleanName.length > 100
    ) {
      return res.status(400).json({
        message:
          'Nama harus 2-100 karakter.',
      });
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        message:
          'Format email tidak valid.',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          'Password minimal 8 karakter dan mengandung huruf serta angka.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message:
          'Password tidak cocok.',
      });
    }

    if (
      cleanFamilyName.length < 3 ||
      cleanFamilyName.length > 100
    ) {
      return res.status(400).json({
        message:
          'Nama keluarga harus 3-100 karakter.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing User
    |--------------------------------------------------------------------------
    */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        message:
          'Email sudah digunakan.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash Password
    |--------------------------------------------------------------------------
    */

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    /*
    |--------------------------------------------------------------------------
    | Create User + Tenant + Membership
    | + Default Categories
    |--------------------------------------------------------------------------
    */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
          |--------------------------------------------------------------------------
          | User
          |--------------------------------------------------------------------------
          */

          const user =
            await tx.user.create({
              data: {
                name: cleanName,
                email: cleanEmail,
                passwordHash,
              },
            });

          /*
          |--------------------------------------------------------------------------
          | Tenant
          |--------------------------------------------------------------------------
          */

          const tenant =
            await tx.tenant.create({
              data: {
                name: cleanFamilyName,
              },
            });

          /*
          |--------------------------------------------------------------------------
          | Membership
          |--------------------------------------------------------------------------
          |
          | User pertama otomatis OWNER.
          |
          */

          const membership =
            await tx.membership.create({
              data: {
                userId: user.id,
                tenantId: tenant.id,
                role: 'OWNER',
                status: 'ACTIVE',
                joinedAt: new Date(),
              },
            });

          /*
          |--------------------------------------------------------------------------
          | Default Income Categories
          |--------------------------------------------------------------------------
          */

          const incomeDefaults = [
            'Gaji',
            'Bonus',
            'Freelance',
            'Bisnis',
            'Investasi', 
            'Hadiah',
            'Lainnya',
          ];

          /*
          |--------------------------------------------------------------------------
          | Default Expense Categories
          |--------------------------------------------------------------------------
          */

          const expenseDefaults = [
            'Makanan',
            'Transportasi',
            'Rumah',
            'Tagihan',
            'Kesehatan',
            'Pendidikan',
            'Hiburan',
            'Belanja',
            'Lainnya',
          ];

          /*
          |--------------------------------------------------------------------------
          | Create Categories
          |--------------------------------------------------------------------------
          */

          await tx.category.createMany({
            data: [
              ...incomeDefaults.map(
                (categoryName) => ({
                  tenantId: tenant.id,
                  name: categoryName,
                  type: 'INCOME',
                  isDefault: true,
                })
              ),

              ...expenseDefaults.map(
                (categoryName) => ({
                  tenantId: tenant.id,
                  name: categoryName,
                  type: 'EXPENSE',
                  isDefault: true,
                })
              ),
            ],
          });

          return {
            user,
            tenant,
            membership,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Create Session
    |--------------------------------------------------------------------------
    */

    const session =
      await createUserSession(
        result.user.id
      );

    /*
    |--------------------------------------------------------------------------
    | Format Tenant
    |--------------------------------------------------------------------------
    */

    const tenant =
      sanitizeTenant(
        result.tenant,
        result.membership
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      message:
        'Registrasi berhasil.',

      token:
        session.token,

      user:
        sanitizeUser(result.user),

      tenant,

      tenants: [
        tenant,
      ],

      session: {
        expiresAt:
          session.expiresAt,
      },
    });
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/auth/login
|--------------------------------------------------------------------------
*/

const login = asyncHandler(
  async (req, res) => {
    const {
      email,
      password,
    } = req.body;

    const cleanEmail =
      normalizeEmail(email);

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (
      !cleanEmail ||
      !password
    ) {
      return res.status(400).json({
        message:
          'Email dan password wajib diisi.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find User
    |--------------------------------------------------------------------------
    */

    const user =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail,
        },
      });

    if (!user) {
      return res.status(401).json({
        message:
          'Email atau password salah.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Password
    |--------------------------------------------------------------------------
    */

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          'Email atau password salah.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Active Memberships
    |--------------------------------------------------------------------------
    */

    const memberships =
      await prisma.membership.findMany({
        where: {
          userId: user.id,

          status: 'ACTIVE',

          role: {
            in: VALID_ROLES,
          },
        },

        include: {
          tenant: true,
        },

        orderBy: {
          joinedAt: 'asc',
        },
      });

    /*
    |--------------------------------------------------------------------------
    | User Must Have Active Tenant
    |--------------------------------------------------------------------------
    */

    if (
      memberships.length === 0
    ) {
      return res.status(403).json({
        message:
          'Akun Anda belum memiliki keluarga/tenant aktif.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Session
    |--------------------------------------------------------------------------
    */

    const session =
      await createUserSession(
        user.id
      );

    /*
    |--------------------------------------------------------------------------
    | Format Tenants
    |--------------------------------------------------------------------------
    */

    const tenants =
      memberships.map(
        (membership) =>
          sanitizeTenant(
            membership.tenant,
            membership
          )
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      message:
        'Login berhasil.',

      token:
        session.token,

      user:
        sanitizeUser(user),

      tenants,

      /*
      |--------------------------------------------------------------------------
      | Tenant pertama menjadi active tenant
      |--------------------------------------------------------------------------
      */

      activeTenant:
        tenants[0],

      /*
      |--------------------------------------------------------------------------
      | Session Info
      |--------------------------------------------------------------------------
      */

      session: {
        expiresAt:
          session.expiresAt,
      },
    });
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/auth/forgot-password
|--------------------------------------------------------------------------
*/

const forgotPassword =
  asyncHandler(
    async (req, res) => {
      const email =
        normalizeEmail(
          req.body.email
        );

      /*
      |--------------------------------------------------------------------------
      | Generic Response
      |--------------------------------------------------------------------------
      |
      | Jangan bocorkan apakah email terdaftar.
      |
      */

      const genericResponse = {
        message:
          'Jika email terdaftar, instruksi reset password telah dikirim.',
      };

      if (
        !email ||
        !EMAIL_REGEX.test(email)
      ) {
        return res.json(
          genericResponse
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Find User
      |--------------------------------------------------------------------------
      */

      const user =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      if (!user) {
        return res.json(
          genericResponse
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Delete Old Reset Tokens
      |--------------------------------------------------------------------------
      */

      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,

          OR: [
            {
              usedAt: {
                not: null,
              },
            },

            {
              expiresAt: {
                lt: new Date(),
              },
            },
          ],
        },
      });

      /*
      |--------------------------------------------------------------------------
      | Generate Reset Token
      |--------------------------------------------------------------------------
      */

      const token =
        crypto
          .randomBytes(32)
          .toString('hex');

      const expiresAt =
        new Date(
          Date.now() +
            60 * 60 * 1000
        );

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      /*
      |--------------------------------------------------------------------------
      | Reset URL
      |--------------------------------------------------------------------------
      */

      const frontendUrl =
        process.env.FRONTEND_URL ||
        'http://localhost:5173';

      const resetUrl =
        `${frontendUrl}/reset-password?token=${token}`;

      /*
      |--------------------------------------------------------------------------
      | Send Email
      |--------------------------------------------------------------------------
      */

      await sendMail({
        to: user.email,

        subject:
          'Reset Password FamFin',

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              line-height: 1.6;
            "
          >
            <h2>
              Reset Password FamFin
            </h2>

            <p>
              Halo ${user.name},
            </p>

            <p>
              Anda meminta untuk melakukan
              reset password akun FamFin.
            </p>

            <p>
              Klik tombol berikut untuk
              membuat password baru:
            </p>

            <p>
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#2563eb;
                  color:#fff;
                  text-decoration:none;
                  border-radius:8px;
                "
              >
                Reset Password
              </a>
            </p>

            <p>
              Link ini berlaku selama
              <strong>1 jam</strong>.
            </p>

            <p>
              Jika Anda tidak meminta reset
              password, abaikan email ini.
            </p>
          </div>
        `,
      });

      return res.json(
        genericResponse
      );
    }
  );

/*
|--------------------------------------------------------------------------
| POST /api/auth/reset-password
|--------------------------------------------------------------------------
*/

const resetPassword =
  asyncHandler(
    async (req, res) => {
      const {
        token,
        newPassword,
        confirmPassword,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | Validation
      |--------------------------------------------------------------------------
      */

      if (
        !token ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          message:
            'Semua field wajib diisi.',
        });
      }

      if (
        !validatePassword(
          newPassword
        )
      ) {
        return res.status(400).json({
          message:
            'Password minimal 8 karakter dan mengandung huruf serta angka.',
        });
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        return res.status(400).json({
          message:
            'Password tidak cocok.',
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Find Reset Token
      |--------------------------------------------------------------------------
      */

      const resetToken =
        await prisma.passwordResetToken.findUnique({
          where: {
            token,
          },
        });

      if (!resetToken) {
        return res.status(400).json({
          message:
            'Link reset password tidak valid atau sudah kedaluwarsa.',
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Already Used
      |--------------------------------------------------------------------------
      */

      if (resetToken.usedAt) {
        return res.status(400).json({
          message:
            'Link reset password sudah digunakan.',
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Expired
      |--------------------------------------------------------------------------
      */

      if (
        resetToken.expiresAt.getTime() <
        Date.now()
      ) {
        return res.status(400).json({
          message:
            'Link reset password sudah kedaluwarsa.',
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Hash New Password
      |--------------------------------------------------------------------------
      */

      const passwordHash =
        await bcrypt.hash(
          newPassword,
          10
        );

      /*
      |--------------------------------------------------------------------------
      | Update Password
      | + Invalidate Reset Token
      |--------------------------------------------------------------------------
      */

      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: resetToken.userId,
          },

          data: {
            passwordHash,
          },
        }),

        prisma.passwordResetToken.update({
          where: {
            id: resetToken.id,
          },

          data: {
            usedAt:
              new Date(),
          },
        }),

        /*
        |--------------------------------------------------------------------------
        | Invalidate Existing Sessions
        |--------------------------------------------------------------------------
        |
        | Setelah password berhasil diganti,
        | semua session lama dipaksa logout.
        |
        */

        prisma.userSession.deleteMany({
          where: {
            userId:
              resetToken.userId,
          },
        }),
      ]);

      return res.json({
        message:
          'Password berhasil diubah. Silakan login dengan password baru.',
      });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
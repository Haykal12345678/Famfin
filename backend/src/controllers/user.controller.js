const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

function validatePassword(password) {
  return (
    password &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/*
|--------------------------------------------------------------------------
| ROLE HELPERS
|--------------------------------------------------------------------------
*/

const isOwner = (membership) => {
  return membership?.role === 'OWNER';
};

const isAdmin = (membership) => {
  return membership?.role === 'ADMIN';
};

const isOwnerOrAdmin = (membership) => {
  return ['OWNER', 'ADMIN'].includes(membership?.role);
};


/*
|--------------------------------------------------------------------------
| GET /api/members
|
| OWNER / ADMIN
|   -> bisa melihat daftar anggota
|
| MEMBER / VIEWER
|   -> tidak boleh melihat daftar anggota
|--------------------------------------------------------------------------
*/

const listMembers = asyncHandler(async (req, res) => {
  const membership = req.membership;

  if (!isOwnerOrAdmin(membership)) {
    return res.status(403).json({
      message: 'Anda tidak memiliki izin untuk melihat daftar anggota.',
    });
  }

  const {
    page = 1,
    pageSize = 20,
    search,
    role,
    status = 'ACTIVE',
  } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);

  const where = {
    tenantId: req.tenantId,

    ...(status && {
      status,
    }),

    ...(role &&
      ROLES.includes(role) && {
        role,
      }),

    ...(search && {
      user: {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
    }),
  };

  const [members, total] = await Promise.all([
    prisma.membership.findMany({
      where,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: [
        {
          role: 'asc',
        },
        {
          joinedAt: 'asc',
        },
      ],

      skip: (pageNumber - 1) * size,
      take: size,
    }),

    prisma.membership.count({
      where,
    }),
  ]);

  res.json({
    items: members.map((m) => ({
      membershipId: m.id,

      user: m.user,

      role: m.role,

      status: m.status,

      invitedAt: m.invitedAt,

      joinedAt: m.joinedAt,
    })),

    total,

    page: pageNumber,

    pageSize: size,

    totalPages: Math.ceil(total / size),
  });
});


/*
|--------------------------------------------------------------------------
| POST /api/members
|
| OWNER
|   -> bisa membuat ADMIN / MEMBER / VIEWER
|
| ADMIN
|   -> hanya bisa membuat MEMBER / VIEWER
|
| MEMBER / VIEWER
|   -> tidak boleh
|--------------------------------------------------------------------------
*/

const createMember = asyncHandler(async (req, res) => {
  const membership = req.membership;

  if (!isOwnerOrAdmin(membership)) {
    return res.status(403).json({
      message: 'Hanya Owner atau Admin yang dapat menambahkan anggota.',
    });
  }

  const {
    name,
    email,
    password,
    role,
  } = req.body;

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Nama wajib diisi.',
    });
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      message: 'Email tidak valid.',
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      message:
        'Password minimal 8 karakter dan mengandung huruf serta angka.',
    });
  }

  if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
    return res.status(400).json({
      message: 'Role tidak valid.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ADMIN tidak boleh membuat ADMIN
  |--------------------------------------------------------------------------
  */

  if (isAdmin(membership) && role === 'ADMIN') {
    return res.status(403).json({
      message: 'Admin tidak dapat membuat anggota dengan role Admin.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Cari user berdasarkan email
  |--------------------------------------------------------------------------
  */

  const normalizedEmail = email.trim().toLowerCase();

  let user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Kalau user sudah ada
  |--------------------------------------------------------------------------
  */

  if (user) {
    const existingMembership =
      await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: req.tenantId,
          },
        },
      });

    if (existingMembership) {
      return res.status(409).json({
        message:
          'User dengan email ini sudah menjadi anggota keluarga ini.',
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Transaction
  |--------------------------------------------------------------------------
  */

  const result = await prisma.$transaction(async (tx) => {
    /*
    |--------------------------------------------------------------------------
    | Create user baru
    |--------------------------------------------------------------------------
    */

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);

      user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create membership
    |--------------------------------------------------------------------------
    */

    const newMembership = await tx.membership.create({
      data: {
        userId: user.id,
        tenantId: req.tenantId,
        role,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    return newMembership;
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId: req.tenantId,

    userId: req.user.id,

    action: 'CREATE',

    module: 'Membership',

    recordId: result.id,

    newValue: {
      membershipId: result.id,
      userId: user.id,
      role: result.role,
      status: result.status,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  res.status(201).json({
    membershipId: result.id,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },

    role: result.role,

    status: result.status,

    /*
     * Password hanya dikembalikan ketika user baru dibuat.
     *
     * Jangan simpan password plaintext.
     */

    temporaryPassword: password,
  });
});


/*
|--------------------------------------------------------------------------
| PATCH /api/members/:membershipId/role
|
| OWNER
|   -> boleh mengubah ADMIN / MEMBER / VIEWER
|
| ADMIN
|   -> hanya boleh mengubah MEMBER / VIEWER
|
| MEMBER / VIEWER
|   -> tidak boleh
|
| OWNER TIDAK BOLEH DITURUNKAN
|--------------------------------------------------------------------------
*/

const updateMemberRole = asyncHandler(async (req, res) => {
  const { membershipId } = req.params;

  const { role } = req.body;

  const currentMembership = req.membership;

  /*
  |--------------------------------------------------------------------------
  | Authorization
  |--------------------------------------------------------------------------
  */

  if (!isOwnerOrAdmin(currentMembership)) {
    return res.status(403).json({
      message:
        'Hanya Owner atau Admin yang dapat mengubah role anggota.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validation role
  |--------------------------------------------------------------------------
  */

  if (!ROLES.includes(role)) {
    return res.status(400).json({
      message: 'Role tidak valid.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Ambil target membership
  |--------------------------------------------------------------------------
  */

  const targetMembership =
    await prisma.membership.findFirst({
      where: {
        id: membershipId,
        tenantId: req.tenantId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  if (!targetMembership) {
    return res.status(404).json({
      message: 'Anggota tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Tidak boleh mengubah diri sendiri
  |--------------------------------------------------------------------------
  */

  if (targetMembership.userId === req.user.id) {
    return res.status(400).json({
      message: 'Anda tidak dapat mengubah role diri sendiri.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | OWNER tidak boleh diubah
  |--------------------------------------------------------------------------
  */

  if (targetMembership.role === 'OWNER') {
    return res.status(403).json({
      message: 'Role Owner tidak dapat diubah.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ADMIN
  |
  | Admin tidak boleh:
  | - membuat Admin baru
  | - mengubah Member menjadi Admin
  | - mengubah Viewer menjadi Admin
  |--------------------------------------------------------------------------
  */

  if (isAdmin(currentMembership) && role === 'ADMIN') {
    return res.status(403).json({
      message:
        'Admin tidak memiliki izin untuk memberikan role Admin.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ADMIN tidak boleh mengubah target ADMIN
  |--------------------------------------------------------------------------
  */

  if (
    isAdmin(currentMembership) &&
    targetMembership.role === 'ADMIN'
  ) {
    return res.status(403).json({
      message:
        'Admin tidak dapat mengubah role Admin lain.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.membership.update({
    where: {
      id: membershipId,
    },

    data: {
      role,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId: req.tenantId,

    userId: req.user.id,

    action: 'UPDATE',

    module: 'Membership',

    recordId: membershipId,

    oldValue: targetMembership,

    newValue: updated,
  });

  res.json({
    membershipId: updated.id,

    user: targetMembership.user,

    role: updated.role,

    status: updated.status,

    joinedAt: updated.joinedAt,

    invitedAt: updated.invitedAt,
  });
});


/*
|--------------------------------------------------------------------------
| DELETE /api/members/:membershipId
|
| OWNER
|   -> bisa remove ADMIN / MEMBER / VIEWER
|
| ADMIN
|   -> hanya bisa remove MEMBER / VIEWER
|
| MEMBER / VIEWER
|   -> tidak boleh
|
| OWNER tidak dapat dihapus
|--------------------------------------------------------------------------
*/

const removeMember = asyncHandler(async (req, res) => {
  const { membershipId } = req.params;

  const currentMembership = req.membership;

  /*
  |--------------------------------------------------------------------------
  | Authorization
  |--------------------------------------------------------------------------
  */

  if (!isOwnerOrAdmin(currentMembership)) {
    return res.status(403).json({
      message:
        'Hanya Owner atau Admin yang dapat mengeluarkan anggota.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Target
  |--------------------------------------------------------------------------
  */

  const targetMembership =
    await prisma.membership.findFirst({
      where: {
        id: membershipId,
        tenantId: req.tenantId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  if (!targetMembership) {
    return res.status(404).json({
      message: 'Anggota tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Tidak boleh remove diri sendiri
  |--------------------------------------------------------------------------
  */

  if (targetMembership.userId === req.user.id) {
    return res.status(400).json({
      message:
        'Anda tidak dapat mengeluarkan diri sendiri dari keluarga.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | OWNER tidak boleh dihapus
  |--------------------------------------------------------------------------
  */

  if (targetMembership.role === 'OWNER') {
    return res.status(400).json({
      message:
        'Owner tidak dapat dikeluarkan dari keluarga.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | ADMIN hanya boleh remove MEMBER / VIEWER
  |--------------------------------------------------------------------------
  */

  if (
    isAdmin(currentMembership) &&
    targetMembership.role === 'ADMIN'
  ) {
    return res.status(403).json({
      message:
        'Admin tidak dapat mengeluarkan Admin lain.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Soft delete
  |
  | Histori transaksi tetap aman.
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.membership.update({
    where: {
      id: membershipId,
    },

    data: {
      status: 'INACTIVE',
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId: req.tenantId,

    userId: req.user.id,

    action: 'DELETE',

    module: 'Membership',

    recordId: membershipId,

    oldValue: targetMembership,

    newValue: updated,
  });

  res.json({
    message: 'Anggota berhasil dikeluarkan dari keluarga.',

    membership: {
      membershipId: updated.id,

      user: targetMembership.user,

      role: updated.role,

      status: updated.status,
    },
  });
});


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  listMembers,
  createMember,
  updateMemberRole,
  removeMember,
};
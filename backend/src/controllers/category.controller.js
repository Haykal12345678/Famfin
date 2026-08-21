const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const { writeAudit } = require('../utils/audit');

const CATEGORY_TYPES = ['INCOME', 'EXPENSE'];
const MANAGEMENT_ROLES = ['OWNER', 'ADMIN'];

const isManager = (membership) => {
  return MANAGEMENT_ROLES.includes(membership?.role);
};


/*
|--------------------------------------------------------------------------
| GET /api/categories
|
| Query:
| ?type=INCOME
| ?type=EXPENSE
| ?includeInactive=true
|
| Default:
| -> hanya kategori aktif
|
| OWNER / ADMIN:
| -> dapat meminta kategori inactive juga
|--------------------------------------------------------------------------
*/

const listCategories = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const membership = req.membership;

  if (!membership) {
    return res.status(403).json({
      message: 'Membership tenant tidak ditemukan.',
    });
  }

  const { type, includeInactive } = req.query;

  /*
  |--------------------------------------------------------------------------
  | Validate type
  |--------------------------------------------------------------------------
  */

  if (type && !CATEGORY_TYPES.includes(type)) {
    return res.status(400).json({
      message: 'Jenis kategori tidak valid.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Include inactive
  |
  | Hanya OWNER / ADMIN yang boleh melihat kategori nonaktif
  |--------------------------------------------------------------------------
  */

  const canViewInactive =
    includeInactive === 'true' &&
    isManager(membership);

  const categories = await prisma.category.findMany({
    where: {
      tenantId,

      /*
      |----------------------------------------------------------------------
      | Kalau includeInactive true:
      | tampilkan aktif + nonaktif
      |
      | Kalau false:
      | hanya aktif
      |----------------------------------------------------------------------
      */

      ...(canViewInactive
        ? {}
        : {
            isActive: true,
          }),

      ...(type
        ? {
            type,
          }
        : {}),
    },

    orderBy: [
      {
        isActive: 'desc',
      },
      {
        isDefault: 'desc',
      },
      {
        name: 'asc',
      },
    ],
  });

  res.json(categories);
});


/*
|--------------------------------------------------------------------------
| POST /api/categories
|
| OWNER / ADMIN
| -> boleh membuat kategori
|--------------------------------------------------------------------------
*/

const createCategory = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;

  if (!isManager(membership)) {
    return res.status(403).json({
      message:
        'Hanya Owner atau Admin yang dapat membuat kategori.',
    });
  }

  const { name, type } = req.body;

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  if (!name || !String(name).trim()) {
    return res.status(400).json({
      message: 'Nama kategori wajib diisi.',
    });
  }

  if (!CATEGORY_TYPES.includes(type)) {
    return res.status(400).json({
      message: 'Jenis kategori tidak valid.',
    });
  }

  const categoryName = String(name).trim();

  /*
  |--------------------------------------------------------------------------
  | Duplicate
  |--------------------------------------------------------------------------
  */

  const duplicate = await prisma.category.findUnique({
    where: {
      tenantId_name_type: {
        tenantId,
        name: categoryName,
        type,
      },
    },
  });

  if (duplicate) {
    return res.status(409).json({
      message:
        duplicate.isActive
          ? 'Kategori dengan nama dan jenis tersebut sudah ada.'
          : 'Kategori dengan nama dan jenis tersebut sudah ada tetapi sedang tidak aktif. Silakan aktifkan kembali kategori tersebut.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Create
  |--------------------------------------------------------------------------
  */

  const category = await prisma.category.create({
    data: {
      tenantId,
      name: categoryName,
      type,
      isActive: true,
      isDefault: false,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId,
    userId,
    action: 'CREATE',
    module: 'Category',
    recordId: category.id,
    newValue: category,
  });

  res.status(201).json(category);
});


/*
|--------------------------------------------------------------------------
| PATCH /api/categories/:id
|
| OWNER / ADMIN
| -> edit custom category
|--------------------------------------------------------------------------
*/

const updateCategory = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;
  const { id } = req.params;

  if (!isManager(membership)) {
    return res.status(403).json({
      message:
        'Hanya Owner atau Admin yang dapat mengubah kategori.',
    });
  }

  const category = await prisma.category.findFirst({
    where: {
      id,
      tenantId,
    },
  });

  if (!category) {
    return res.status(404).json({
      message: 'Kategori tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Default category protection
  |--------------------------------------------------------------------------
  */

  if (category.isDefault) {
    return res.status(400).json({
      message:
        'Kategori bawaan sistem tidak dapat diubah.',
    });
  }

  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({
      message: 'Nama kategori wajib diisi.',
    });
  }

  const categoryName = String(name).trim();

  /*
  |--------------------------------------------------------------------------
  | Duplicate
  |--------------------------------------------------------------------------
  */

  const duplicate = await prisma.category.findUnique({
    where: {
      tenantId_name_type: {
        tenantId,
        name: categoryName,
        type: category.type,
      },
    },
  });

  if (
    duplicate &&
    duplicate.id !== category.id
  ) {
    return res.status(409).json({
      message:
        'Kategori dengan nama dan jenis tersebut sudah ada.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.category.update({
    where: {
      id,
    },

    data: {
      name: categoryName,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId,
    userId,
    action: 'UPDATE',
    module: 'Category',
    recordId: id,
    oldValue: category,
    newValue: updated,
  });

  res.json(updated);
});


/*
|--------------------------------------------------------------------------
| DELETE /api/categories/:id
|
| Soft Delete
|
| OWNER / ADMIN
| -> menonaktifkan custom category
|--------------------------------------------------------------------------
*/

const deactivateCategory = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;
  const { id } = req.params;

  if (!isManager(membership)) {
    return res.status(403).json({
      message:
        'Hanya Owner atau Admin yang dapat menonaktifkan kategori.',
    });
  }

  const category = await prisma.category.findFirst({
    where: {
      id,
      tenantId,
    },
  });

  if (!category) {
    return res.status(404).json({
      message: 'Kategori tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Default category protection
  |--------------------------------------------------------------------------
  */

  if (category.isDefault) {
    return res.status(400).json({
      message:
        'Kategori bawaan sistem tidak dapat dinonaktifkan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Already inactive
  |--------------------------------------------------------------------------
  */

  if (!category.isActive) {
    return res.status(400).json({
      message: 'Kategori sudah tidak aktif.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Soft Delete
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.category.update({
    where: {
      id,
    },

    data: {
      isActive: false,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId,
    userId,
    action: 'DELETE',
    module: 'Category',
    recordId: id,
    oldValue: category,
    newValue: updated,
  });

  res.json(updated);
});


/*
|--------------------------------------------------------------------------
| PATCH /api/categories/:id/activate
|
| OWNER / ADMIN
| -> mengaktifkan kembali kategori custom
|--------------------------------------------------------------------------
*/

const activateCategory = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user.id;
  const membership = req.membership;
  const { id } = req.params;

  /*
  |--------------------------------------------------------------------------
  | Permission
  |--------------------------------------------------------------------------
  */

  if (!isManager(membership)) {
    return res.status(403).json({
      message:
        'Hanya Owner atau Admin yang dapat mengaktifkan kategori.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Find category
  |--------------------------------------------------------------------------
  */

  const category = await prisma.category.findFirst({
    where: {
      id,
      tenantId,
    },
  });

  if (!category) {
    return res.status(404).json({
      message: 'Kategori tidak ditemukan.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Default category
  |
  | Sebenarnya default tidak perlu diaktifkan manual,
  | tapi kita tetap handle agar aman.
  |--------------------------------------------------------------------------
  */

  if (category.isDefault) {
    return res.status(400).json({
      message:
        'Kategori bawaan sistem tidak perlu diaktifkan secara manual.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Already active
  |--------------------------------------------------------------------------
  */

  if (category.isActive) {
    return res.status(400).json({
      message: 'Kategori sudah aktif.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Activate
  |--------------------------------------------------------------------------
  */

  const updated = await prisma.category.update({
    where: {
      id,
    },

    data: {
      isActive: true,
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Audit
  |--------------------------------------------------------------------------
  */

  await writeAudit({
    tenantId,
    userId,
    action: 'ACTIVATE',
    module: 'Category',
    recordId: id,
    oldValue: category,
    newValue: updated,
  });

  res.json(updated);
});


module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
};
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'haykal@famfin.test' },
    update: {},
    create: { name: 'Haykal', email: 'haykal@famfin.test', passwordHash },
  });

  const tenant = await prisma.tenant.create({ data: { name: 'Keluarga Haykal' } });

  await prisma.membership.create({
    data: { userId: user.id, tenantId: tenant.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
  });

  const incomeDefaults = ['Gaji', 'Bonus', 'Freelance', 'Bisnis', 'Investasi', 'Hadiah', 'Lainnya'];
  const expenseDefaults = ['Makanan', 'Transportasi', 'Rumah', 'Tagihan', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Belanja', 'Lainnya'];

  await prisma.category.createMany({
    data: [
      ...incomeDefaults.map((n) => ({ tenantId: tenant.id, name: n, type: 'INCOME', isDefault: true })),
      ...expenseDefaults.map((n) => ({ tenantId: tenant.id, name: n, type: 'EXPENSE', isDefault: true })),
    ],
  });

  const bca = await prisma.account.create({
    data: { tenantId: tenant.id, name: 'BCA', type: 'BANK', initialBalance: 10000000, currentBalance: 10000000, initialBalanceDate: new Date() },
  });
  await prisma.account.create({
    data: { tenantId: tenant.id, name: 'Cash', type: 'CASH', initialBalance: 500000, currentBalance: 500000, initialBalanceDate: new Date() },
  });

  console.log('Seed selesai.');
  console.log('Login demo -> email: haykal@famfin.test | password: password123');
  console.log('tenantId:', tenant.id, '| accountId BCA:', bca.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

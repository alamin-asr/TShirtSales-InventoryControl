import { PrismaClient, Role, Size } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed never creates or updates admin users. Admins must use the registration flow.
  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  await prisma.adminRegistrationState.upsert({
    where: { id: 1 },
    update: { registrationClosed: adminCount >= 2 },
    create: { id: 1, registrationClosed: adminCount >= 2 },
  });
  console.log(`Admin registration slots available: ${Math.max(0, 2 - adminCount)}`);

  // Initialize central stock entries for each size (start at 0)
  const sizes = [Size.S, Size.M, Size.L, Size.XL, Size.XXL];
  for (const size of sizes) {
    await prisma.centralStock.upsert({
      where: { size },
      update: {},
      create: { size, quantity: 0 },
    });
  }
  console.log('Central stock entries initialized for all sizes');

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

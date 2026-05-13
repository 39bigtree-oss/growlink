import { PrismaClient, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@growlink.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "growlink-admin-pass";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      name: "Growlink Admin",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  await prisma.staff.upsert({
    where: { userId: user.id },
    update: {
      email: adminEmail,
      name: "Growlink Admin",
      role: StaffRole.ADMIN,
    },
    create: {
      userId: user.id,
      email: adminEmail,
      name: "Growlink Admin",
      role: StaffRole.ADMIN,
    },
  });

  // 開発用ログイン情報は PII を含まないため出力可。
  console.log(`Seeded admin user: ${adminEmail}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

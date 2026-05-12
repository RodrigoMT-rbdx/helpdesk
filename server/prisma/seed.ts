import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Role } from "../src/generated/prisma/enums.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.SEED_ADMIN_PASSWORD ?? "password123";

async function main() {
  const hashed = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name: "Admin",
      email,
      emailVerified: true,
      role: Role.admin,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: email } },
    update: { password: hashed },
    create: {
      id: crypto.randomUUID(),
      accountId: email,
      providerId: "credential",
      userId: user.id,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

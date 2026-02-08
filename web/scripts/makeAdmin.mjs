import { PrismaClient } from "../lib/generated/prisma/default.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const identifier = process.argv[2];

if (!identifier) {
  console.error("Usage: node scripts/makeAdmin.mjs <email-or-mobile>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  const isEmail = identifier.includes("@");
  const where = isEmail
    ? { email: identifier.trim().toLowerCase() }
    : { mobile: identifier.replace(/\D/g, "") };

  const user = await prisma.user.findUnique({ where });

  if (!user) {
    console.error(`No user found with ${isEmail ? "email" : "mobile"}: ${identifier}`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });

  console.log(`Updated user ${updated.id} (${updated.email}) -> role: ${updated.role}`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
  await pool.end();
}

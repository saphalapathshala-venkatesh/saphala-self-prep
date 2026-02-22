import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  const result = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "test1@saphala.com" },
        { mobile: "9000000001" },
      ],
    },
  });
  console.log(`Deleted ${result.count} user(s).`);
} catch (err) {
  console.error("Error deleting test user:", err.message);
} finally {
  await prisma.$disconnect();
  await pool.end();
}

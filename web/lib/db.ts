import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("[db] DATABASE_URL is not set — cannot create Prisma client");
  }

  const proto = connectionString.split("://")[0] ?? "";
  if (proto === "prisma+postgres") {
    throw new Error(
      "[db] DATABASE_URL is set to a local Prisma Postgres dev URL (prisma+postgres://). " +
      "Set DATABASE_URL to the Neon PostgreSQL pooler URL (postgresql://...pooler...) in your deployment environment."
    );
  }
  if (proto !== "postgresql" && proto !== "postgres") {
    throw new Error(
      `[db] DATABASE_URL has unrecognised protocol "${proto}://". Expected postgresql:// or postgres://.`
    );
  }

  const host = connectionString.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
  console.log(`[db] Initialising PrismaClient — host: ${host}`);

  const pool = new Pool({
    connectionString,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    max: 2,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

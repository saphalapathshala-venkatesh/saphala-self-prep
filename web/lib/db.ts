import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString,
    // Keep TCP connections alive so Neon doesn't drop idle sockets
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    // Destroy idle connections after 60s (default was 10s — too aggressive for Neon)
    idleTimeoutMillis: 60_000,
    // Fail fast on connection errors rather than hanging indefinitely
    connectionTimeoutMillis: 10_000,
    max: 5,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

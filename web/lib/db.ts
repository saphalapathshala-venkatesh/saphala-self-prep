import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "[db] FATAL: DATABASE_URL is not set. " +
      "All database queries will fail until this is fixed."
    );
    return new PrismaClient();
  }

  const proto = connectionString.split("://")[0] ?? "";

  if (proto === "prisma+postgres") {
    console.error(
      "[db] FATAL: DATABASE_URL is a Replit-local Prisma proxy URL (prisma+postgres://). " +
      "This URL only works inside Replit and is not valid for the Neon adapter."
    );
    return new PrismaClient();
  }

  if (proto !== "postgresql" && proto !== "postgres") {
    console.error(
      `[db] FATAL: DATABASE_URL has unrecognised protocol "${proto}://". ` +
      "Expected postgresql:// or postgres://."
    );
    return new PrismaClient();
  }

  const host = connectionString.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
  console.log(`[db] Initialising PrismaClient (Neon HTTP adapter) — host: ${host}`);

  // Neon serverless HTTP driver — stateless HTTP per query, no TCP pool.
  // Results are cached at the application layer via unstable_cache.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeonHttp(connectionString, {} as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

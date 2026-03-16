import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

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
      "[db] DATABASE_URL is set to a local Prisma dev URL (prisma+postgres://). " +
      "Set DATABASE_URL to the Neon PostgreSQL pooler URL (postgresql://...pooler...) in your environment."
    );
  }
  if (proto !== "postgresql" && proto !== "postgres") {
    throw new Error(
      `[db] DATABASE_URL has unrecognised protocol "${proto}://". Expected postgresql:// or postgres://.`
    );
  }

  const host = connectionString.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
  console.log(`[db] Initialising PrismaClient (Neon HTTP) — host: ${host}`);

  // Neon serverless HTTP driver — stateless HTTP per query, no TCP pool, no WebSocket.
  // Works reliably on Vercel serverless, Replit autoscale, and local Node.js.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeonHttp(connectionString, {} as any);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

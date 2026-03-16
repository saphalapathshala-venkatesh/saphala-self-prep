import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  // ── Validation with graceful fallback ──────────────────────────────────────
  // IMPORTANT: We intentionally do NOT throw here.
  // Throwing at module-init time causes the serverless function to crash before
  // the route handler runs, so the server returns a 502 (Bad Gateway) and the
  // error is invisible to the application's own try/catch blocks.
  //
  // Instead we log loudly and return a bare PrismaClient that will throw on the
  // first query — that throw IS caught by route-level try/catch which returns a
  // proper 503 with a structured error body.
  //
  // FIX: In Vercel → Project Settings → Environment Variables, set DATABASE_URL
  // to the Neon pooler connection string:
  //   postgresql://neondb_owner:<pwd>@<ep>-pooler.<region>.aws.neon.tech/neondb?sslmode=require

  if (!connectionString) {
    console.error(
      "[db] FATAL: DATABASE_URL is not set. " +
      "In Vercel: Project Settings → Environment Variables → add DATABASE_URL set to the Neon pooler URL. " +
      "All database queries will fail until this is fixed."
    );
    return new PrismaClient();
  }

  const proto = connectionString.split("://")[0] ?? "";

  if (proto === "prisma+postgres") {
    // This is Replit's local Prisma proxy URL — it only resolves inside Replit.
    // It is never valid in Vercel or any other external host.
    console.error(
      "[db] FATAL: DATABASE_URL is a Replit-local Prisma proxy URL (prisma+postgres://). " +
      "This URL only works inside Replit. " +
      "In Vercel: Project Settings → Environment Variables → set DATABASE_URL to the Neon pooler URL. " +
      "All database queries will fail until this is fixed."
    );
    return new PrismaClient();
  }

  if (proto !== "postgresql" && proto !== "postgres") {
    console.error(
      `[db] FATAL: DATABASE_URL has unrecognised protocol "${proto}://". ` +
      "Expected postgresql:// or postgres://. " +
      "All database queries will fail until this is fixed."
    );
    return new PrismaClient();
  }

  // ── Happy path ─────────────────────────────────────────────────────────────
  const host = connectionString.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
  console.log(`[db] Initialising PrismaClient (Neon HTTP adapter) — host: ${host}`);

  // Neon serverless HTTP driver — stateless HTTP per query, no TCP pool, no WebSocket.
  // Works on Vercel serverless, Replit autoscale, and local Node.js.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeonHttp(connectionString, {} as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

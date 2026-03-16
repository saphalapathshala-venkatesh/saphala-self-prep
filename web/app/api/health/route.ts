import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const proto = dbUrl.split("://")[0] ?? "NOT_SET";
  const host = dbUrl.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
  const safeHost = dbUrl ? `${proto}://...@${host}/...` : "DATABASE_URL not set";

  // Test 1 — raw query
  let rawOk = false;
  let rawError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    rawOk = true;
  } catch (e) {
    rawError = e instanceof Error ? e.message : String(e);
  }

  // Test 2 — table count
  let tableCount = 0;
  try {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    tableCount = Number(rows[0]?.count ?? 0);
  } catch {
    // ignore
  }

  // Test 3 — ORM model query (same path as login)
  let ormOk = false;
  let ormError: string | null = null;
  try {
    await prisma.user.count();
    ormOk = true;
  } catch (e) {
    ormError = e instanceof Error ? e.message : String(e);
  }

  // Test 4 — Session model (used in one-device check)
  let sessionOk = false;
  let sessionError: string | null = null;
  try {
    await prisma.session.count();
    sessionOk = true;
  } catch (e) {
    sessionError = e instanceof Error ? e.message : String(e);
  }

  const ok = rawOk && ormOk;

  return NextResponse.json(
    {
      ok,
      env: process.env.NODE_ENV,
      host: safeHost,
      tables: tableCount,
      raw: rawOk ? "ok" : rawError,
      orm: ormOk ? "ok" : ormError,
      session: sessionOk ? "ok" : sessionError,
    },
    { status: ok ? 200 : 500 }
  );
}

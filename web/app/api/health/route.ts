import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const proto = dbUrl.split("://")[0] ?? "NOT_SET";
  const host = dbUrl.split("@")[1]?.split("/")[0]?.split(":")[0] ?? "unknown";
  const safeHost = dbUrl ? `${proto}://...@${host}/...` : "DATABASE_URL not set";

  try {
    await prisma.$queryRaw`SELECT 1`;

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

    return NextResponse.json({
      ok: true,
      db: "ok",
      env: process.env.NODE_ENV,
      host: safeHost,
      tables: tableCount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        ok: false,
        db: "error",
        env: process.env.NODE_ENV,
        host: safeHost,
        error: msg,
      },
      { status: 500 }
    );
  }
}

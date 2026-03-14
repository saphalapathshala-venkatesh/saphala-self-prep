import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function safeDbHost(): string {
  try {
    const url = process.env.DATABASE_URL ?? "";
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "(unreadable)";
  }
}

export async function GET() {
  try {
    const [userCount, testCount, sessionCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.test.count(),
      prisma.session.count(),
      prisma.category.count(),
    ]);

    return Response.json({
      ok: true,
      db: {
        host: safeDbHost(),
      },
      tables: {
        users: userCount,
        tests: testCount,
        sessions: sessionCount,
        categories: categoryCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown database error";

    return Response.json(
      {
        ok: false,
        db: {
          host: safeDbHost(),
        },
        error: message.replace(/postgresql:\/\/[^@]+@/g, "postgresql://***@"),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

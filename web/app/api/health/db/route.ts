import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [userCount, testCount, sessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.test.count(),
      prisma.session.count(),
    ]);

    return Response.json({
      ok: true,
      tables: {
        users: userCount,
        tests: testCount,
        sessions: sessionCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown database error";

    return Response.json(
      {
        ok: false,
        error: message.replace(/postgresql:\/\/[^@]+@/g, "postgresql://***@"),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

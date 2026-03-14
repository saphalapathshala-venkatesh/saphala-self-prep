import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDbTestById } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { testId } = await params;

  const test = await getDbTestById(testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, testId },
    orderBy: { startedAt: "asc" },
  });

  const xpEntries = await prisma.xpLedgerEntry.findMany({
    where: {
      userId: user.id,
      refType: "Attempt",
      refId: { in: attempts.map((a) => a.id) },
    },
    select: { refId: true, delta: true, meta: true },
  });

  type XpMeta = { baseXP?: number; bonusXP?: number; xpMultiplier?: number; attemptNumber?: number };
  const xpMap = new Map(xpEntries.map((x) => [x.refId, { delta: x.delta, meta: x.meta as XpMeta | null }]));

  return Response.json({
    testTitle: test.title,
    attemptsAllowed: test.attemptsAllowed,
    attempts: attempts.map((a) => {
      const xpEntry = xpMap.get(a.id);
      const meta = xpEntry?.meta;
      return {
        id: a.id,
        attemptNumber: a.attemptNumber,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        scorePct: a.scorePct,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount,
        unansweredCount: a.unansweredCount,
        totalTimeUsedMs: a.totalTimeUsedMs,
        xpAwarded: xpEntry?.delta ?? null,
        xpMultiplier: meta?.xpMultiplier ?? null,
      };
    }),
  });
}

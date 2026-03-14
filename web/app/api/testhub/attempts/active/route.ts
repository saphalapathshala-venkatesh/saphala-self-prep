import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveAttempt, getAttemptsForUserTest } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");

  if (!testId) {
    return Response.json({ error: "testId is required" }, { status: 400 });
  }

  const active = await getActiveAttempt(user.id, testId);
  const allAttempts = await getAttemptsForUserTest(user.id, testId);

  const completedAttempts = allAttempts.filter((a) => a.status === "SUBMITTED");

  let summary: { bestScore: number | null; latestScore: number | null; lastXp: number | null } | null = null;

  if (completedAttempts.length > 0) {
    const bestScore = Math.max(...completedAttempts.map((a) => a.scorePct));
    const latestScore = completedAttempts[completedAttempts.length - 1].scorePct;

    const lastXpEntry = await prisma.xpLedgerEntry.findFirst({
      where: {
        userId: user.id,
        refType: "Attempt",
        refId: { in: completedAttempts.map((a) => a.id) },
      },
      orderBy: { createdAt: "desc" },
      select: { delta: true },
    });

    summary = {
      bestScore,
      latestScore,
      lastXp: lastXpEntry?.delta ?? null,
    };
  }

  return Response.json({
    activeAttempt: active
      ? { attemptId: active.id, language: active.language, attemptNumber: active.attemptNumber }
      : null,
    attemptsUsed: allAttempts.length,
    summary,
  });
}

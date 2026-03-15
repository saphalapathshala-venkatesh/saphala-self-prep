import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAttemptById, getDbTestById } from "@/lib/testhubDb";
import { getAllResultsForTest } from "@/lib/resultStore";
import { computeOrGetResult } from "@/lib/resultComputer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attemptId");

  if (!attemptId) {
    return Response.json({ error: "attemptId is required" }, { status: 400 });
  }

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (attempt.status !== "SUBMITTED") {
    return Response.json({ error: "Attempt not yet submitted" }, { status: 400 });
  }

  // Primary: in-memory cache. Fallback: recompute from DB (handles server restarts).
  const result = await computeOrGetResult(attemptId, user.id);
  if (!result) {
    return Response.json({ error: "Result not available." }, { status: 404 });
  }

  const test = await getDbTestById(attempt.testId);
  const maxMarks = test ? test.totalQuestions * test.marksPerQuestion : 0;

  // XP breakdown from ledger meta — always read from DB
  const xpEntry = await prisma.xpLedgerEntry.findFirst({
    where: { userId: user.id, refType: "Attempt", refId: attemptId },
    select: { delta: true, meta: true },
  });
  type XpMeta = { baseXP?: number; bonusXP?: number; xpMultiplier?: number };
  const meta = xpEntry?.meta as XpMeta | null;
  const xpBreakdown = {
    attemptNumber: attempt.attemptNumber,
    baseXP: meta?.baseXP ?? 0,
    bonusXP: meta?.bonusXP ?? 0,
    xpMultiplier:
      meta?.xpMultiplier ??
      (attempt.attemptNumber === 1 ? 1.0 : attempt.attemptNumber === 2 ? 0.5 : 0),
  };

  // Total XP always read from DB — never from in-memory store
  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });
  const totalXp = totalXpAgg._sum.delta ?? 0;

  const allResults = getAllResultsForTest(attempt.testId);
  const showLeaderboard = allResults.length >= 30;

  let top10: Array<{ displayName: string; netMarks: number; accuracyPercent: number; timeUsedMs: number }> = [];
  let rank = result.rank;
  let percentile = result.percentile;

  if (showLeaderboard) {
    const sorted = [...allResults].sort((a, b) => {
      if (b.netMarksTotal !== a.netMarksTotal) return b.netMarksTotal - a.netMarksTotal;
      if (b.accuracyPercent !== a.accuracyPercent) return b.accuracyPercent - a.accuracyPercent;
      if (a.totalTimeUsedMs !== b.totalTimeUsedMs) return a.totalTimeUsedMs - b.totalTimeUsedMs;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    rank = sorted.findIndex((r) => r.resultId === result.resultId) + 1;
    const belowCount = allResults.filter((r) => r.netMarksTotal < result.netMarksTotal).length;
    percentile = Math.round(((100 * belowCount) / allResults.length) * 100) / 100;

    top10 = sorted.slice(0, 10).map((r, i) => ({
      displayName: `Learner #${i + 1}`,
      netMarks: r.netMarksTotal,
      accuracyPercent: r.accuracyPercent,
      timeUsedMs: r.totalTimeUsedMs,
    }));
  }

  return Response.json({
    resultId: result.resultId,
    testTitle: test?.title ?? "",
    testCode: test?.code ?? "",
    totalQuestions: test?.totalQuestions ?? 0,
    maxMarks,
    durationMinutes: test?.durationMinutes ?? 0,
    showLeaderboard,
    totals: {
      grossMarksTotal: result.grossMarksTotal,
      negativeMarksTotal: result.negativeMarksTotal,
      netMarksTotal: result.netMarksTotal,
      accuracyPercent: result.accuracyPercent,
      totalTimeUsedMs: result.totalTimeUsedMs,
    },
    subjectBreakdown: result.subjectBreakdown,
    rank,
    percentile,
    xpEarned: result.xpEarned,
    xpBreakdown,
    totalXp,
    top10: showLeaderboard ? top10 : [],
  });
}

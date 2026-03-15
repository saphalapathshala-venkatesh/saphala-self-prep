import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAttemptById } from "@/lib/testhubDb";
import { getAllResultsForTest } from "@/lib/resultStore";
import { computeOrGetResult } from "@/lib/resultComputer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { attemptId } = body;

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

  const result = await computeOrGetResult(attemptId, user.id);
  if (!result) {
    console.error(`[generate-result] computeOrGetResult returned null for attempt ${attemptId}`);
    return Response.json({ error: "Unable to compute result." }, { status: 500 });
  }

  const allResults = getAllResultsForTest(attempt.testId);
  const showLeaderboard = allResults.length >= 30;

  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });
  const totalXp = totalXpAgg._sum.delta ?? 0;

  let top10: Array<{
    displayName: string;
    netMarks: number;
    accuracyPercent: number;
    timeUsedMs: number;
  }> = [];

  if (showLeaderboard) {
    const sorted = [...allResults].sort((a, b) => {
      if (b.netMarksTotal !== a.netMarksTotal) return b.netMarksTotal - a.netMarksTotal;
      if (b.accuracyPercent !== a.accuracyPercent) return b.accuracyPercent - a.accuracyPercent;
      if (a.totalTimeUsedMs !== b.totalTimeUsedMs) return a.totalTimeUsedMs - b.totalTimeUsedMs;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const rank = sorted.findIndex((r) => r.resultId === result.resultId) + 1;
    const belowCount = allResults.filter((r) => r.netMarksTotal < result.netMarksTotal).length;
    const percentile = Math.round(((100 * belowCount) / allResults.length) * 100) / 100;
    result.rank = rank;
    result.percentile = percentile;

    top10 = sorted.slice(0, 10).map((r, i) => ({
      displayName: `Learner #${i + 1}`,
      netMarks: r.netMarksTotal,
      accuracyPercent: r.accuracyPercent,
      timeUsedMs: r.totalTimeUsedMs,
    }));
  }

  return Response.json({
    resultId: result.resultId,
    showLeaderboard,
    totals: {
      grossMarksTotal: result.grossMarksTotal,
      negativeMarksTotal: result.negativeMarksTotal,
      netMarksTotal: result.netMarksTotal,
      accuracyPercent: result.accuracyPercent,
      totalTimeUsedMs: result.totalTimeUsedMs,
      maxMarks: 0,
    },
    subjectBreakdown: result.subjectBreakdown,
    rank: result.rank,
    percentile: result.percentile,
    xpEarned: result.xpEarned,
    totalXp,
    top10: showLeaderboard ? top10 : [],
  });
}

import { getCurrentUser } from "@/lib/auth";
import { getAttemptById, getDbTestById } from "@/lib/testhubDb";
import {
  getResultByAttemptId,
  getAllResultsForTest,
  getUserTotalXp,
} from "@/lib/resultStore";

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

  const result = getResultByAttemptId(attemptId);
  if (!result) {
    return Response.json({ error: "Result not generated yet" }, { status: 404 });
  }

  const test = await getDbTestById(attempt.testId);
  const maxMarks = test ? test.totalQuestions * test.marksPerQuestion : 0;

  const allResults = getAllResultsForTest(attempt.testId);
  const showLeaderboard = allResults.length >= 30;
  const totalXp = getUserTotalXp(user.id);

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
    percentile = Math.round((100 * belowCount) / allResults.length * 100) / 100;

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
    totalXp,
    top10: showLeaderboard ? top10 : [],
  });
}

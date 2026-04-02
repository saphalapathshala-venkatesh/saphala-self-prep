import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAttemptById, getDbTestById, getFirstAttemptsForTest } from "@/lib/testhubDb";
import { computeOrGetResult } from "@/lib/resultComputer";

export const dynamic = "force-dynamic";

function computeExamTimeMs(startedAt: Date, submittedAt: Date | null): number {
  if (submittedAt) return submittedAt.getTime() - startedAt.getTime();
  return 0;
}

function computeNetMarks(correctCount: number, wrongCount: number, marksPerQ: number, negMarks: number): number {
  return Math.round((correctCount * marksPerQ - wrongCount * negMarks) * 100) / 100;
}

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

  const result = await computeOrGetResult(attemptId, user.id);
  if (!result) {
    return Response.json({ error: "Result not available." }, { status: 404 });
  }

  const test = await getDbTestById(attempt.testId);
  const maxMarks = result.maxMarks;

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

  const totalXpAgg = await prisma.xpLedgerEntry.aggregate({
    where: { userId: user.id },
    _sum: { delta: true },
  });
  const totalXp = totalXpAgg._sum.delta ?? 0;

  const firstAttempts = await getFirstAttemptsForTest(attempt.testId);
  const totalFirst = firstAttempts.length;
  const showLeaderboard = totalFirst >= 5;

  const marksPerQ = test?.marksPerQuestion ?? 1;
  const negMarks = test?.negativeMarks ?? 0;

  // Use stored netMarks (per-question accurate) when available; fall back to flat approximation
  // for older attempts recorded before this column was added.
  function getNetMarks(a: { netMarks: number | null; correctCount: number; wrongCount: number }): number {
    return a.netMarks ?? computeNetMarks(a.correctCount, a.wrongCount, marksPerQ, negMarks);
  }

  const sorted = [...firstAttempts].sort((a, b) => {
    const aN = getNetMarks(a);
    const bN = getNetMarks(b);
    if (bN !== aN) return bN - aN;
    if (b.scorePct !== a.scorePct) return b.scorePct - a.scorePct;
    const aT = computeExamTimeMs(a.startedAt, a.submittedAt);
    const bT = computeExamTimeMs(b.startedAt, b.submittedAt);
    if (aT !== bT) return aT - bT;
    const aS = a.submittedAt?.getTime() ?? 0;
    const bS = b.submittedAt?.getTime() ?? 0;
    return aS - bS;
  });

  const userFirstAttempt = firstAttempts.find((a) => a.userId === user.id);
  let rank: number | null = null;
  let percentile: number | null = null;

  if (userFirstAttempt && totalFirst > 0) {
    const userNet = getNetMarks(userFirstAttempt);
    rank = sorted.findIndex((a) => a.id === userFirstAttempt.id) + 1;
    const belowCount = firstAttempts.filter((a) => getNetMarks(a) < userNet).length;
    percentile = Math.round(((100 * belowCount) / totalFirst) * 100) / 100;
  }

  let topper: { marks: number; accuracy: number; examTimeMs: number } | null = null;
  if (sorted.length > 0) {
    const t = sorted[0];
    topper = {
      marks: getNetMarks(t),
      accuracy: Math.round(t.scorePct * 100) / 100,
      examTimeMs: computeExamTimeMs(t.startedAt, t.submittedAt),
    };
  }

  const cohortAvgTimeMs =
    firstAttempts.length > 0
      ? Math.round(
          firstAttempts.reduce((sum, a) => sum + computeExamTimeMs(a.startedAt, a.submittedAt), 0) /
            firstAttempts.length
        )
      : 0;

  const top10 = sorted.slice(0, 10).map((a, i) => ({
    rank: i + 1,
    displayName: `Learner #${i + 1}`,
    netMarks: getNetMarks(a),
    accuracyPercent: Math.round(a.scorePct * 10) / 10,
    examTimeMs: computeExamTimeMs(a.startedAt, a.submittedAt),
  }));

  return Response.json({
    resultId: result.resultId,
    testTitle: test?.title ?? "",
    testCode: test?.code ?? "",
    totalQuestions: test?.totalQuestions ?? 0,
    maxMarks,
    durationMinutes: test?.durationMinutes ?? 0,
    showLeaderboard,
    totalFirstAttempts: totalFirst,
    totals: {
      grossMarksTotal: result.grossMarksTotal,
      negativeMarksTotal: result.negativeMarksTotal,
      netMarksTotal: result.netMarksTotal,
      accuracyPercent: result.accuracyPercent,
      totalExamTimeMs: result.totalTimeUsedMs,
    },
    subjectBreakdown: result.subjectBreakdown,
    rank: showLeaderboard ? rank : null,
    percentile: showLeaderboard ? percentile : null,
    topper: showLeaderboard ? topper : null,
    cohortAvgTimeMs: showLeaderboard ? cohortAvgTimeMs : null,
    xpEarned: result.xpEarned,
    xpBreakdown,
    totalXp,
    top10: showLeaderboard ? top10 : [],
  });
}

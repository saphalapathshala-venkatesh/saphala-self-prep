import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getAttemptById,
  getAnswersForAttempt,
  getDbTestById,
  getDbQuestionsForTest,
} from "@/lib/testhubDb";
import {
  getResultByAttemptId,
  saveResult,
  getAllResultsForTest,
  addUserXp,
  getUserTotalXp,
  type MockResult,
  type SubjectBreakdown,
} from "@/lib/resultStore";

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

  // Check XP idempotency guard from DB
  const existingXpEntry = await prisma.xpLedgerEntry.findFirst({
    where: { userId: user.id, refType: "Attempt", refId: attemptId },
  });

  // Check in-memory result cache
  const existing = getResultByAttemptId(attemptId);

  if (existing) {
    // Result already computed this session — persist scores to DB (idempotent) and write XP if needed
    const correct = existing.subjectBreakdown.reduce((s, sb) => s + sb.correctCount, 0);
    const wrong = existing.subjectBreakdown.reduce((s, sb) => s + sb.incorrectCount, 0);
    const unattempted = existing.subjectBreakdown.reduce((s, sb) => s + sb.unattemptedCount, 0);

    await Promise.all([
      prisma.attempt.update({
        where: { id: attemptId },
        data: {
          scorePct: existing.accuracyPercent,
          correctCount: correct,
          wrongCount: wrong,
          unansweredCount: unattempted,
          totalTimeUsedMs: existing.totalTimeUsedMs,
        },
      }),
      ...(!existingXpEntry
        ? [
            prisma.xpLedgerEntry.create({
              data: {
                userId: user.id,
                delta: existing.xpEarned,
                reason: "TestHub test completion",
                refType: "Attempt",
                refId: attemptId,
                meta: { testId: attempt.testId, accuracyPercent: existing.accuracyPercent },
              },
            }),
          ]
        : []),
    ]);

    return buildResponse(existing, attempt.testId, user.id);
  }

  // Not in cache — compute fresh from DB
  const test = await getDbTestById(attempt.testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const questions = await getDbQuestionsForTest(test.id);
  const answers = await getAnswersForAttempt(attemptId);
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const subjectAgg: Record<
    string,
    {
      subjectId: string;
      subjectName: string;
      correct: number;
      incorrect: number;
      unattempted: number;
      grossMarks: number;
      negativeMarks: number;
      timeUsedMs: number;
    }
  > = {};

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnattempted = 0;
  let totalTimeUsedMs = 0;

  for (const q of questions) {
    const sid = q.subjectId || "general";
    const sname = q.subjectName || "General";

    if (!subjectAgg[sid]) {
      subjectAgg[sid] = {
        subjectId: sid,
        subjectName: sname,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        grossMarks: 0,
        negativeMarks: 0,
        timeUsedMs: 0,
      };
    }
    const sub = subjectAgg[sid];
    const ans = answerMap.get(q.id);

    if (!ans || ans.selectedOptionId === null) {
      sub.unattempted++;
      totalUnattempted++;
      if (ans) {
        sub.timeUsedMs += ans.timeSpentMs;
        totalTimeUsedMs += ans.timeSpentMs;
      }
      continue;
    }

    const correctOption = q.options.find((o) => o.isCorrect);
    const isCorrect = correctOption ? ans.selectedOptionId === correctOption.id : false;
    sub.timeUsedMs += ans.timeSpentMs;
    totalTimeUsedMs += ans.timeSpentMs;

    if (isCorrect) {
      sub.correct++;
      sub.grossMarks += test.marksPerQuestion;
      totalCorrect++;
    } else {
      sub.incorrect++;
      sub.negativeMarks += test.negativeMarks;
      totalIncorrect++;
    }
  }

  const grossMarksTotal = totalCorrect * test.marksPerQuestion;
  const negativeMarksTotal = totalIncorrect * test.negativeMarks;
  const netMarksTotal = grossMarksTotal - negativeMarksTotal;
  const answeredCount = totalCorrect + totalIncorrect;
  const accuracyPercent =
    answeredCount > 0
      ? Math.round(((100 * totalCorrect) / answeredCount) * 100) / 100
      : 0;

  const subjectBreakdown: SubjectBreakdown[] = Object.values(subjectAgg).map((s) => ({
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    grossMarks: s.grossMarks,
    negativeMarks: s.negativeMarks,
    netMarks: s.grossMarks - s.negativeMarks,
    correctCount: s.correct,
    incorrectCount: s.incorrect,
    unattemptedCount: s.unattempted,
    timeUsedMs: s.timeUsedMs,
  }));

  const baseXP = totalCorrect * 2;
  const bonusXP = accuracyPercent >= 80 ? 10 : 0;
  const xpEarned = baseXP + bonusXP;

  const result: MockResult = {
    resultId: `result_${attemptId}_${Date.now()}`,
    attemptId,
    testId: attempt.testId,
    userId: user.id,
    grossMarksTotal,
    negativeMarksTotal,
    netMarksTotal,
    accuracyPercent,
    totalTimeUsedMs,
    rank: null,
    percentile: null,
    xpEarned,
    subjectBreakdown,
    createdAt: new Date().toISOString(),
  };

  saveResult(result);
  addUserXp(user.id, xpEarned);

  // Persist scores to Attempt and write XP to DB ledger
  await Promise.all([
    prisma.attempt.update({
      where: { id: attemptId },
      data: {
        scorePct: accuracyPercent,
        correctCount: totalCorrect,
        wrongCount: totalIncorrect,
        unansweredCount: totalUnattempted,
        totalTimeUsedMs,
      },
    }),
    ...(!existingXpEntry
      ? [
          prisma.xpLedgerEntry.create({
            data: {
              userId: user.id,
              delta: xpEarned,
              reason: "TestHub test completion",
              refType: "Attempt",
              refId: attemptId,
              meta: {
                testId: attempt.testId,
                correct: totalCorrect,
                accuracyPercent,
                baseXP,
                bonusXP,
              },
            },
          }),
        ]
      : []),
  ]);

  const allResults = getAllResultsForTest(attempt.testId);
  const showLeaderboard = allResults.length >= 30;

  if (showLeaderboard) {
    const sorted = [...allResults].sort((a, b) => {
      if (b.netMarksTotal !== a.netMarksTotal) return b.netMarksTotal - a.netMarksTotal;
      if (b.accuracyPercent !== a.accuracyPercent) return b.accuracyPercent - a.accuracyPercent;
      if (a.totalTimeUsedMs !== b.totalTimeUsedMs) return a.totalTimeUsedMs - b.totalTimeUsedMs;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const rank = sorted.findIndex((r) => r.resultId === result.resultId) + 1;
    const belowCount = allResults.filter((r) => r.netMarksTotal < result.netMarksTotal).length;
    const percentile =
      Math.round(((100 * belowCount) / allResults.length) * 100) / 100;

    result.rank = rank;
    result.percentile = percentile;
    saveResult(result);
  }

  return buildResponse(result, attempt.testId, user.id);
}

function buildResponse(result: MockResult, testId: string, userId: string) {
  const allResults = getAllResultsForTest(testId);
  const showLeaderboard = allResults.length >= 30;
  const totalXp = getUserTotalXp(userId);

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
    const percentile =
      Math.round(((100 * belowCount) / allResults.length) * 100) / 100;
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

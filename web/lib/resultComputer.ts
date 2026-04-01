import { prisma } from "./db";
import {
  getAttemptById,
  getDbTestById,
  getDbQuestionsForTest,
  getAnswersForAttempt,
} from "./testhubDb";
import {
  getResultByAttemptId,
  saveResult,
  type MockResult,
  type SubjectBreakdown,
} from "./resultStore";

export async function computeOrGetResult(
  attemptId: string,
  userId: string
): Promise<MockResult | null> {
  const cached = getResultByAttemptId(attemptId);
  if (cached) return cached;

  const attempt = await getAttemptById(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.status !== "SUBMITTED") {
    return null;
  }

  const test = await getDbTestById(attempt.testId);
  if (!test) return null;

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
      if (ans) sub.timeUsedMs += ans.timeSpentMs;
      continue;
    }

    const correctOption = q.options.find((o) => o.isCorrect);
    const isCorrect = correctOption ? ans.selectedOptionId === correctOption.id : false;
    sub.timeUsedMs += ans.timeSpentMs;

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

  // XP is the admin-configured flat value (same pattern as Videos/Ebooks).
  // 1st attempt → 100%, 2nd → 50%, 3rd+ → 0 XP (still allowed to attempt).
  const baseXP = test.xpEnabled && test.xpValue > 0 ? test.xpValue : 0;
  const bonusXP = 0;
  const xpMultiplier =
    attempt.attemptNumber === 1 ? 1.0 : attempt.attemptNumber === 2 ? 0.5 : 0;
  const xpEarned = Math.round(baseXP * xpMultiplier);

  const totalExamTimeMs = attempt.submittedAt
    ? attempt.submittedAt.getTime() - attempt.startedAt.getTime()
    : Object.values(subjectAgg).reduce((sum, s) => sum + s.timeUsedMs, 0);

  const result: MockResult = {
    resultId: `result_${attemptId}_${Date.now()}`,
    attemptId,
    testId: attempt.testId,
    userId,
    grossMarksTotal,
    negativeMarksTotal,
    netMarksTotal,
    accuracyPercent,
    totalTimeUsedMs: totalExamTimeMs,
    rank: null,
    percentile: null,
    xpEarned,
    subjectBreakdown,
    createdAt: new Date().toISOString(),
  };

  saveResult(result);

  const existingXpEntry = await prisma.xpLedgerEntry.findFirst({
    where: { userId, refType: "Attempt", refId: attemptId },
  });

  await Promise.all([
    prisma.attempt.update({
      where: { id: attemptId },
      data: {
        scorePct: accuracyPercent,
        correctCount: totalCorrect,
        wrongCount: totalIncorrect,
        unansweredCount: totalUnattempted,
        totalTimeUsedMs: totalExamTimeMs,
      },
    }),
    ...(!existingXpEntry
      ? [
          prisma.xpLedgerEntry.create({
            data: {
              userId,
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
                xpMultiplier,
                attemptNumber: attempt.attemptNumber,
              },
            },
          }),
        ]
      : []),
  ]);

  return result;
}

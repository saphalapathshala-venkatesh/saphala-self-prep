import { getCurrentUser } from "@/lib/auth";
import {
  getAttemptById,
  getDbTestById,
  getDbQuestionsForTest,
  getAnswersForAttempt,
  getFirstAttemptAnswersForQuestions,
  getFirstAttemptsForTest,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

function examTimeMs(startedAt: Date, submittedAt: Date | null): number {
  return submittedAt ? submittedAt.getTime() - startedAt.getTime() : 0;
}

function netMarks(correct: number, wrong: number, mPerQ: number, neg: number): number {
  return Math.round((correct * mPerQ - wrong * neg) * 100) / 100;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attemptId");
  if (!attemptId) return Response.json({ error: "attemptId is required" }, { status: 400 });

  const attempt = await getAttemptById(attemptId);
  if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.userId !== user.id) return Response.json({ error: "Unauthorized" }, { status: 403 });
  if (attempt.status !== "SUBMITTED") return Response.json({ error: "Not submitted" }, { status: 400 });

  const test = await getDbTestById(attempt.testId);
  if (!test) return Response.json({ error: "Test not found" }, { status: 404 });

  const questions = await getDbQuestionsForTest(test.id);
  const questionIds = questions.map((q) => q.id);

  const [answers, firstAttempts, firstAnswersRaw] = await Promise.all([
    getAnswersForAttempt(attemptId),
    getFirstAttemptsForTest(attempt.testId),
    getFirstAttemptAnswersForQuestions(questionIds, attempt.testId),
  ]);

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const qAvgTimeMap = new Map<string, number>();
  const qTimeAccum = new Map<string, { sum: number; count: number }>();
  for (const fa of firstAnswersRaw) {
    const acc = qTimeAccum.get(fa.questionId) ?? { sum: 0, count: 0 };
    acc.sum += fa.timeSpentMs;
    acc.count += 1;
    qTimeAccum.set(fa.questionId, acc);
  }
  for (const [qId, acc] of qTimeAccum) {
    qAvgTimeMap.set(qId, acc.count > 0 ? Math.round(acc.sum / acc.count) : 0);
  }

  type SubjectStats = {
    subjectId: string;
    subjectName: string;
    total: number;
    correct: number;
    wrong: number;
    unattempted: number;
    learnerTimeMs: number;
    avgTimeMs: number;
    timeRatioSum: number;
    timeRatioCount: number;
  };

  const subjectMap = new Map<string, SubjectStats>();

  let correctEfficient = 0, correctSlow = 0, wrongRushed = 0, wrongHeavy = 0, unattemptedCount = 0;

  for (const q of questions) {
    const sid = q.subjectId || "general";
    const sname = q.subjectName || "General";
    if (!subjectMap.has(sid)) {
      subjectMap.set(sid, { subjectId: sid, subjectName: sname, total: 0, correct: 0, wrong: 0, unattempted: 0, learnerTimeMs: 0, avgTimeMs: 0, timeRatioSum: 0, timeRatioCount: 0 });
    }
    const sub = subjectMap.get(sid)!;
    sub.total++;

    const ans = answerMap.get(q.id);
    const learnerTime = ans?.timeSpentMs ?? 0;
    const avgTime = qAvgTimeMap.get(q.id) ?? 0;
    const ratio = avgTime > 0 ? learnerTime / avgTime : 1.0;
    sub.learnerTimeMs += learnerTime;
    sub.avgTimeMs += avgTime;

    if (!ans || ans.selectedOptionId === null) {
      sub.unattempted++;
      unattemptedCount++;
      continue;
    }

    const correctOption = q.options.find((o) => o.isCorrect);
    const isCorrect = correctOption ? ans.selectedOptionId === correctOption.id : false;

    if (avgTime > 0) {
      sub.timeRatioSum += ratio;
      sub.timeRatioCount++;
    }

    if (isCorrect) {
      sub.correct++;
      if (ratio <= 1.15) correctEfficient++;
      else correctSlow++;
    } else {
      sub.wrong++;
      if (ratio < 0.75) wrongRushed++;
      else if (ratio > 1.15) wrongHeavy++;
      else wrongRushed++;
    }
  }

  const totalQuestions = questions.length;
  const totalAnswered = answers.filter((a) => a.selectedOptionId !== null).length;
  const totalCorrect = attempt.correctCount;
  const totalWrong = attempt.wrongCount;
  const attemptRatePct = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;
  const accuracyPct = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

  const learnerExamTimeMs = examTimeMs(attempt.startedAt, attempt.submittedAt);
  const cohortAvgTimeMs =
    firstAttempts.length > 0
      ? firstAttempts.reduce((s, a) => s + examTimeMs(a.startedAt, a.submittedAt), 0) / firstAttempts.length
      : 0;

  function accuracyColor(pct: number, attempted: number): string {
    if (attempted === 0) return "gray";
    if (pct >= 75) return "green";
    if (pct >= 50) return "yellow";
    if (pct >= 30) return "orange";
    return "red";
  }

  function timeStatus(ratio: number): string {
    if (ratio < 0.85) return "Faster than average";
    if (ratio <= 1.15) return "Near average";
    if (ratio <= 1.5) return "Slower than average";
    return "Much slower than average";
  }

  function timeStatusColor(ratio: number): string {
    if (ratio < 0.85) return "blue";
    if (ratio <= 1.15) return "green";
    if (ratio <= 1.5) return "orange";
    return "red";
  }

  const MIN_SAMPLES_FOR_TIME = 5;
  const hasSufficientTimeSamples = firstAnswersRaw.length >= MIN_SAMPLES_FOR_TIME;

  const accuracyHeatMap = Array.from(subjectMap.values()).map((s) => {
    const attempted = s.correct + s.wrong;
    const accPct = attempted > 0 ? Math.round((s.correct / attempted) * 100) : 0;
    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      total: s.total,
      correct: s.correct,
      wrong: s.wrong,
      unattempted: s.unattempted,
      attempted,
      accuracyPct: accPct,
      color: accuracyColor(accPct, attempted),
      status: attempted === 0 ? "Not attempted" : accPct >= 75 ? "Strong" : accPct >= 50 ? "Moderate" : accPct >= 30 ? "Weak" : "Very Weak",
      meaning: attempted === 0 ? "You did not attempt any questions in this area." : accPct >= 75 ? "You are performing well here." : accPct >= 50 ? "Room for improvement." : "Focus and revise this area.",
    };
  });

  const timeHeatMap = hasSufficientTimeSamples
    ? Array.from(subjectMap.values()).map((s) => {
        const ratio = s.timeRatioCount > 0 ? s.timeRatioSum / s.timeRatioCount : 1.0;
        const avgPerQ = s.total > 0 ? Math.round(s.avgTimeMs / s.total) : 0;
        const learnerPerQ = s.total > 0 ? Math.round(s.learnerTimeMs / s.total) : 0;
        return {
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          learnerAvgTimeMs: learnerPerQ,
          cohortAvgTimeMs: avgPerQ,
          ratio: Math.round(ratio * 100) / 100,
          color: timeStatusColor(ratio),
          status: timeStatus(ratio),
        };
      })
    : null;

  const riskHeatMap = {
    correctEfficient,
    correctSlow,
    wrongRushed,
    wrongHeavy,
    unattempted: unattemptedCount,
    total: totalQuestions,
    limitedSamples: !hasSufficientTimeSamples,
  };

  function focusPriority(score: number): string {
    if (score >= 70) return "High Priority";
    if (score >= 45) return "Moderate Priority";
    if (score >= 25) return "Low Priority";
    return "Strong Area";
  }

  function focusAction(priority: string, subjectName: string): string {
    if (priority === "High Priority") return `Urgently revise ${subjectName} concepts and practice more questions.`;
    if (priority === "Moderate Priority") return `Review key areas of ${subjectName} and attempt more timed practice.`;
    if (priority === "Low Priority") return `Consolidate your understanding of ${subjectName}.`;
    return `Maintain your strong performance in ${subjectName}.`;
  }

  const focusAreas = Array.from(subjectMap.values()).map((s) => {
    const attempted = s.correct + s.wrong;
    const subAccPct = attempted > 0 ? (s.correct / attempted) * 100 : 0;
    const accRisk = 100 - subAccPct;
    const unattemptedRatePct = s.total > 0 ? (s.unattempted / s.total) * 100 : 0;

    const avgRatio = s.timeRatioCount > 0 ? s.timeRatioSum / s.timeRatioCount : 1.0;
    let timeRisk = 0;
    if (avgRatio > 1.0 && avgRatio <= 1.2) timeRisk = 25;
    else if (avgRatio > 1.2 && avgRatio <= 1.5) timeRisk = 60;
    else if (avgRatio > 1.5) timeRisk = 100;

    const wrongDensityRisk = s.total > 0 ? (s.wrong / s.total) * 100 : 0;

    const focusScore = Math.round(
      0.45 * accRisk + 0.2 * unattemptedRatePct + 0.2 * timeRisk + 0.15 * wrongDensityRisk
    );

    const priority = focusPriority(focusScore);
    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      accuracyPct: Math.round(subAccPct),
      unattemptedPct: Math.round(unattemptedRatePct),
      timeStatus: hasSufficientTimeSamples ? timeStatus(avgRatio) : "Insufficient data",
      focusScore,
      priority,
      action: focusAction(priority, s.subjectName),
    };
  }).sort((a, b) => b.focusScore - a.focusScore);

  const suggestions: string[] = [];

  if (accuracyPct < 55 && cohortAvgTimeMs > 0 && learnerExamTimeMs < 0.85 * cohortAvgTimeMs) {
    suggestions.push("You are solving faster than most learners, but your accuracy is low. Slow down slightly and read questions more carefully before choosing your answer.");
  } else if (accuracyPct < 55 && cohortAvgTimeMs > 0 && learnerExamTimeMs > 1.15 * cohortAvgTimeMs) {
    suggestions.push("You are spending more time than average, but accuracy is still low. Focus on concept clarity and practice recognising question patterns faster.");
  } else if (accuracyPct >= 70 && attemptRatePct < 75) {
    suggestions.push("Your accuracy is good, but you are leaving too many questions unattempted. Work on your confidence and speed — attempt more questions in the time available.");
  } else if (attemptRatePct >= 85 && accuracyPct < 55) {
    suggestions.push("Your attempt rate is high, but too many answers are incorrect. Focus on selective and controlled attempts instead of guessing under pressure.");
  } else if (accuracyPct >= 75 && attemptRatePct >= 80) {
    suggestions.push("This is a strong performance. Maintain this speed-accuracy balance and focus on eliminating small mistakes to push your score even higher.");
  }

  for (const sub of Array.from(subjectMap.values())) {
    const attempted = sub.correct + sub.wrong;
    const subAccPct = attempted > 0 ? (sub.correct / attempted) * 100 : 0;
    const unattemptedRatePct = sub.total > 0 ? (sub.unattempted / sub.total) * 100 : 0;
    const avgRatio = sub.timeRatioCount > 0 ? sub.timeRatioSum / sub.timeRatioCount : 1.0;
    const n = sub.subjectName;

    if (subAccPct < 50 && attempted > 0) {
      suggestions.push(`Your accuracy in ${n} is low (${Math.round(subAccPct)}%). Revise the core concepts and practice more standard questions from this area.`);
    }
    if (unattemptedRatePct > 40) {
      suggestions.push(`You left many ${n} questions unattempted (${Math.round(unattemptedRatePct)}%). This suggests low confidence or slow recall. Revise basics and do timed drills.`);
    }
    if (hasSufficientTimeSamples && subAccPct >= 70 && avgRatio > 1.2 && attempted > 0) {
      suggestions.push(`You are getting ${n} questions correct, but taking more time than average (${Math.round(avgRatio * 100)}% of avg). Improve speed through repeated timed practice.`);
    }
    if (hasSufficientTimeSamples && subAccPct < 50 && avgRatio < 0.85 && attempted > 0) {
      suggestions.push(`You are solving ${n} questions quickly but accuracy is weak. Slow down and focus on careful reading before answering.`);
    }
    if (hasSufficientTimeSamples && subAccPct >= 75 && avgRatio <= 1.1 && unattemptedRatePct <= 20 && attempted > 0) {
      suggestions.push(`${n} is one of your strong areas. Maintain this performance and use it to secure confident marks in the exam.`);
    }
  }

  return Response.json({
    accuracyHeatMap,
    timeHeatMap,
    riskHeatMap,
    focusAreas,
    suggestions: suggestions.slice(0, 8),
    meta: {
      totalFirstAttempts: firstAttempts.length,
      hasSufficientTimeSamples,
      learnerExamTimeMs,
      cohortAvgTimeMs: Math.round(cohortAvgTimeMs),
    },
  });
}

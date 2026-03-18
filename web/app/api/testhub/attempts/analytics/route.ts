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

  const qTimeAccum = new Map<string, { sum: number; count: number }>();
  for (const fa of firstAnswersRaw) {
    const acc = qTimeAccum.get(fa.questionId) ?? { sum: 0, count: 0 };
    acc.sum += fa.timeSpentMs;
    acc.count += 1;
    qTimeAccum.set(fa.questionId, acc);
  }
  const qAvgTimeMap = new Map<string, number>();
  for (const [qId, acc] of qTimeAccum) {
    qAvgTimeMap.set(qId, acc.count > 0 ? Math.round(acc.sum / acc.count) : 0);
  }

  // ── Taxonomy bucket: finest level available per question ──
  // key = "sub:<subtopicId>" | "top:<topicId>" | "subj:<subjectId>" | "general"
  type TaxoBucket = {
    key: string;
    level: "subtopic" | "topic" | "subject" | "general";
    label: string;
    subjectName: string;
    topicName: string | null;
    subtopicName: string | null;
    total: number;
    correct: number;
    wrong: number;
    unattempted: number;
    learnerTimeMs: number;
    cohortTimeMs: number;
    timeRatioSum: number;
    timeRatioCount: number;
  };

  function resolveBucketKey(q: (typeof questions)[0]): {
    key: string;
    level: TaxoBucket["level"];
    label: string;
    subjectName: string;
    topicName: string | null;
    subtopicName: string | null;
  } {
    if (q.subtopicId && q.subtopicName) {
      return {
        key: `sub:${q.subtopicId}`,
        level: "subtopic",
        label: q.subtopicName,
        subjectName: q.subjectName ?? "General",
        topicName: q.topicName ?? null,
        subtopicName: q.subtopicName,
      };
    }
    if (q.topicId && q.topicName) {
      return {
        key: `top:${q.topicId}`,
        level: "topic",
        label: q.topicName,
        subjectName: q.subjectName ?? "General",
        topicName: q.topicName,
        subtopicName: null,
      };
    }
    if (q.subjectId && q.subjectName) {
      return {
        key: `subj:${q.subjectId}`,
        level: "subject",
        label: q.subjectName,
        subjectName: q.subjectName,
        topicName: null,
        subtopicName: null,
      };
    }
    return {
      key: "general",
      level: "general",
      label: "General",
      subjectName: "General",
      topicName: null,
      subtopicName: null,
    };
  }

  const bucketMap = new Map<string, TaxoBucket>();

  let correctEfficient = 0, correctSlow = 0, wrongRushed = 0, wrongHeavy = 0, unattemptedCount = 0;

  for (const q of questions) {
    const { key, level, label, subjectName, topicName, subtopicName } = resolveBucketKey(q);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        key, level, label, subjectName, topicName, subtopicName,
        total: 0, correct: 0, wrong: 0, unattempted: 0,
        learnerTimeMs: 0, cohortTimeMs: 0, timeRatioSum: 0, timeRatioCount: 0,
      });
    }
    const b = bucketMap.get(key)!;
    b.total++;

    const ans = answerMap.get(q.id);
    const learnerTime = ans?.timeSpentMs ?? 0;
    const avgTime = qAvgTimeMap.get(q.id) ?? 0;
    const ratio = avgTime > 0 ? learnerTime / avgTime : 1.0;
    b.learnerTimeMs += learnerTime;
    b.cohortTimeMs += avgTime;

    if (!ans || ans.selectedOptionId === null) {
      b.unattempted++;
      unattemptedCount++;
      continue;
    }

    const correctOption = q.options.find((o) => o.isCorrect);
    const isCorrect = correctOption ? ans.selectedOptionId === correctOption.id : false;

    if (avgTime > 0) {
      b.timeRatioSum += ratio;
      b.timeRatioCount++;
    }

    if (isCorrect) {
      b.correct++;
      if (ratio <= 1.15) correctEfficient++;
      else correctSlow++;
    } else {
      b.wrong++;
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

  const buckets = Array.from(bucketMap.values());

  const accuracyHeatMap = buckets.map((b) => {
    const attempted = b.correct + b.wrong;
    const accPct = attempted > 0 ? Math.round((b.correct / attempted) * 100) : 0;
    return {
      key: b.key,
      level: b.level,
      label: b.label,
      subjectName: b.subjectName,
      topicName: b.topicName,
      subtopicName: b.subtopicName,
      total: b.total,
      correct: b.correct,
      wrong: b.wrong,
      unattempted: b.unattempted,
      attempted,
      accuracyPct: accPct,
      color: accuracyColor(accPct, attempted),
      status:
        attempted === 0
          ? "Not attempted"
          : accPct >= 75
          ? "Strong"
          : accPct >= 50
          ? "Moderate"
          : accPct >= 30
          ? "Weak"
          : "Very Weak",
      meaning:
        attempted === 0
          ? "You did not attempt any questions in this area."
          : accPct >= 75
          ? "You are performing well here. Keep it up."
          : accPct >= 50
          ? "Room for improvement — revise weak concepts."
          : "Focus and revise this area before the exam.",
    };
  });

  const timeHeatMap = hasSufficientTimeSamples
    ? buckets.map((b) => {
        const ratio = b.timeRatioCount > 0 ? b.timeRatioSum / b.timeRatioCount : 1.0;
        const cohortPerQ = b.total > 0 ? Math.round(b.cohortTimeMs / b.total) : 0;
        const learnerPerQ = b.total > 0 ? Math.round(b.learnerTimeMs / b.total) : 0;
        return {
          key: b.key,
          level: b.level,
          label: b.label,
          subjectName: b.subjectName,
          topicName: b.topicName,
          subtopicName: b.subtopicName,
          learnerAvgTimeMs: learnerPerQ,
          cohortAvgTimeMs: cohortPerQ,
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

  function focusAction(priority: string, label: string): string {
    if (priority === "High Priority")
      return `Urgently revise ${label} concepts and practice more questions.`;
    if (priority === "Moderate Priority")
      return `Review key areas of ${label} and attempt more timed practice.`;
    if (priority === "Low Priority")
      return `Consolidate your understanding of ${label}.`;
    return `Maintain your strong performance in ${label}.`;
  }

  const focusAreas = buckets
    .map((b) => {
      const attempted = b.correct + b.wrong;
      const subAccPct = attempted > 0 ? (b.correct / attempted) * 100 : 0;
      const accRisk = 100 - subAccPct;
      const unattemptedRatePct = b.total > 0 ? (b.unattempted / b.total) * 100 : 0;

      const avgRatio = b.timeRatioCount > 0 ? b.timeRatioSum / b.timeRatioCount : 1.0;
      let timeRisk = 0;
      if (avgRatio > 1.0 && avgRatio <= 1.2) timeRisk = 25;
      else if (avgRatio > 1.2 && avgRatio <= 1.5) timeRisk = 60;
      else if (avgRatio > 1.5) timeRisk = 100;

      const wrongDensityRisk = b.total > 0 ? (b.wrong / b.total) * 100 : 0;

      const focusScore = Math.round(
        0.45 * accRisk + 0.2 * unattemptedRatePct + 0.2 * timeRisk + 0.15 * wrongDensityRisk
      );

      const priority = focusPriority(focusScore);
      return {
        key: b.key,
        level: b.level,
        label: b.label,
        subjectName: b.subjectName,
        topicName: b.topicName,
        subtopicName: b.subtopicName,
        accuracyPct: Math.round(subAccPct),
        unattemptedPct: Math.round(unattemptedRatePct),
        timeStatus: hasSufficientTimeSamples ? timeStatus(avgRatio) : "Insufficient data",
        focusScore,
        priority,
        action: focusAction(priority, b.label),
      };
    })
    .sort((a, b) => b.focusScore - a.focusScore);

  // ── Mentor suggestions ────────────────────────────────────────
  const suggestions: string[] = [];

  // T1 – fast but inaccurate
  if (accuracyPct < 55 && cohortAvgTimeMs > 0 && learnerExamTimeMs < 0.85 * cohortAvgTimeMs) {
    suggestions.push(
      "You are solving faster than most learners, but your accuracy is low. Slow down slightly and read each question carefully before choosing your answer."
    );
  // T2 – slow and inaccurate
  } else if (accuracyPct < 55 && cohortAvgTimeMs > 0 && learnerExamTimeMs > 1.15 * cohortAvgTimeMs) {
    suggestions.push(
      "You are spending more time than average, but accuracy is still low. Focus on concept clarity and practice recognising question patterns faster."
    );
  // T3 – good accuracy but low attempt rate
  } else if (accuracyPct >= 70 && attemptRatePct < 75) {
    suggestions.push(
      "Your accuracy is good, but you are leaving too many questions unattempted. Build confidence and speed — attempt more questions in the time available."
    );
  // T4 – high attempt rate but poor accuracy
  } else if (attemptRatePct >= 85 && accuracyPct < 55) {
    suggestions.push(
      "Your attempt rate is high, but too many answers are incorrect. Switch to selective and controlled attempts instead of guessing under pressure."
    );
  // T5 – strong overall
  } else if (accuracyPct >= 75 && attemptRatePct >= 80) {
    suggestions.push(
      "This is a strong performance. Maintain this speed-accuracy balance and focus on eliminating small mistakes to push your score even higher."
    );
  }

  // P-rules per taxonomy bucket (topic/subtopic level where possible)
  for (const b of buckets) {
    const attempted = b.correct + b.wrong;
    const subAccPct = attempted > 0 ? (b.correct / attempted) * 100 : 0;
    const unattemptedRatePct = b.total > 0 ? (b.unattempted / b.total) * 100 : 0;
    const avgRatio = b.timeRatioCount > 0 ? b.timeRatioSum / b.timeRatioCount : 1.0;
    const n = b.label;

    // P1 – weak accuracy
    if (subAccPct < 50 && attempted > 0) {
      suggestions.push(
        `Your accuracy in ${n} is low (${Math.round(subAccPct)}%). Revise the core concepts and practice more questions from this area.`
      );
    }
    // P2 – high unattempted rate
    if (unattemptedRatePct > 40) {
      suggestions.push(
        `You left many ${n} questions unattempted (${Math.round(unattemptedRatePct)}%). Revise the basics and do timed drills to improve recall speed.`
      );
    }
    // P3 – correct but slow
    if (hasSufficientTimeSamples && subAccPct >= 70 && avgRatio > 1.2 && attempted > 0) {
      suggestions.push(
        `You are getting ${n} questions correct, but taking longer than average (${Math.round(avgRatio * 100)}% of avg). Improve speed through repeated timed practice.`
      );
    }
    // P4 – fast but wrong
    if (hasSufficientTimeSamples && subAccPct < 50 && avgRatio < 0.85 && attempted > 0) {
      suggestions.push(
        `You are solving ${n} questions quickly but accuracy is weak. Slow down and read carefully before answering.`
      );
    }
    // P5 – strong area
    if (
      hasSufficientTimeSamples &&
      subAccPct >= 75 &&
      avgRatio <= 1.1 &&
      unattemptedRatePct <= 20 &&
      attempted > 0
    ) {
      suggestions.push(
        `${n} is one of your strong areas. Maintain this performance and use it to secure confident marks in the exam.`
      );
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

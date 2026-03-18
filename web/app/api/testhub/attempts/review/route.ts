import { getCurrentUser } from "@/lib/auth";
import {
  getAttemptById,
  getAnswersForAttempt,
  getDbTestById,
  getDbQuestionsForTest,
  getTestSectionsForAttempt,
  getFirstAttemptAnswersForQuestions,
} from "@/lib/testhubDb";
import { hasRealContent } from "@/lib/sanitizeHtml";

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

  const test = await getDbTestById(attempt.testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const [questions, answers, sections] = await Promise.all([
    getDbQuestionsForTest(test.id),
    getAnswersForAttempt(attemptId),
    getTestSectionsForAttempt(test.id),
  ]);

  const questionIds = questions.map((q) => q.id);
  const firstAttemptAnswers = await getFirstAttemptAnswersForQuestions(questionIds, test.id);

  const qTimeAccum = new Map<string, { sum: number; count: number }>();
  for (const fa of firstAttemptAnswers) {
    const acc = qTimeAccum.get(fa.questionId) ?? { sum: 0, count: 0 };
    acc.sum += fa.timeSpentMs;
    acc.count += 1;
    qTimeAccum.set(fa.questionId, acc);
  }

  const MIN_SAMPLES = 5;

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const reviewQuestions = questions.map((q) => {
    const ans = answerMap.get(q.id);
    const acc = qTimeAccum.get(q.id);
    const validCount = acc?.count ?? 0;

    let avgTimeMs: number | null = null;
    let limitedSample = false;
    if (validCount >= MIN_SAMPLES && acc) {
      avgTimeMs = Math.round(acc.sum / acc.count);
    } else if (validCount > 0 && validCount < MIN_SAMPLES) {
      avgTimeMs = Math.round(acc!.sum / acc!.count);
      limitedSample = true;
    }

    const correctOption = q.options.find((o) => o.isCorrect);
    const correctLetter = correctOption ? ["A", "B", "C", "D"][correctOption.order] || "A" : "A";

    let userSelectedLetter: string | null = null;
    if (ans?.selectedOptionId) {
      const selectedOpt = q.options.find((o) => o.id === ans.selectedOptionId);
      if (selectedOpt) {
        userSelectedLetter = ["A", "B", "C", "D"][selectedOpt.order] || null;
      }
    }

    const learnerTime = ans?.timeSpentMs ?? 0;
    const ratio = avgTimeMs && avgTimeMs > 0 ? learnerTime / avgTimeMs : null;

    let behaviorTag: string | null = null;
    const isAttempted = userSelectedLetter !== null;
    const isCorrect = isAttempted && userSelectedLetter === correctLetter;
    if (ratio !== null && isAttempted) {
      if (isCorrect && ratio <= 0.9) behaviorTag = "Efficient Solve";
      else if (isCorrect && ratio > 1.25) behaviorTag = "Correct but Slow";
      else if (!isCorrect && ratio < 0.75) behaviorTag = "Rushed Error";
      else if (!isCorrect && ratio > 1.15) behaviorTag = "Time-Heavy Mistake";
    }

    return {
      questionId: q.id,
      order: q.order,
      sectionId: q.sectionId ?? null,
      subjectName: q.subjectName || "General",
      questionText_en: q.questionText_en,
      questionText_te: q.questionText_te,
      options_en: q.options.map((o, idx) => ({
        key: ["A", "B", "C", "D"][idx] || "A",
        text: o.textEn || "",
      })),
      options_te: q.options.map((o, idx) => ({
        key: ["A", "B", "C", "D"][idx] || "A",
        text: o.textTe || "",
      })),
      correctOption: correctLetter,
      explanation_en: hasRealContent(q.explanation_en)
        ? q.explanation_en!
        : `The correct answer is Option ${correctLetter}.`,
      explanation_te: hasRealContent(q.explanation_te)
        ? q.explanation_te!
        : (hasRealContent(q.explanation_en)
          ? q.explanation_en!
          : `The correct answer is Option ${correctLetter}.`),
      userSelectedOption: userSelectedLetter,
      isMarkedForReview: ans?.isMarkedForReview ?? false,
      timeSpentMs: learnerTime,
      avgTimeMs,
      limitedSample,
      validAttemptsCount: validCount,
      behaviorTag,
    };
  });

  return Response.json({
    testMeta: {
      id: test.id,
      name: test.title,
      code: test.code,
      totalQuestions: test.totalQuestions,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarks: test.negativeMarks,
    },
    attemptMeta: {
      attemptId: attempt.id,
      language: attempt.language,
      submittedAt: attempt.submittedAt,
    },
    sections: sections.map((s) => ({ id: s.id, title: s.title, sortOrder: s.sortOrder })),
    questions: reviewQuestions,
  });
}

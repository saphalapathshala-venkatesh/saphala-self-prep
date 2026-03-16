import { getCurrentUser } from "@/lib/auth";
import {
  getAttemptById,
  getAnswersForAttempt,
  getDbTestById,
  getDbQuestionsForTest,
  getTestSectionsForAttempt,
  getAllSubmittedAnswersForQuestion,
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
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const reviewQuestions = await Promise.all(
    questions.map(async (q) => {
      const ans = answerMap.get(q.id);
      const allSubmitted = await getAllSubmittedAnswersForQuestion(q.id);
      const validCount = allSubmitted.length;

      let medianTimeMs: number | null = null;
      if (validCount >= 20) {
        const times = allSubmitted.map((a) => a.timeSpentMs).sort((a, b) => a - b);
        const mid = Math.floor(times.length / 2);
        medianTimeMs = times.length % 2 === 0
          ? Math.round((times[mid - 1] + times[mid]) / 2)
          : times[mid];
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
        timeSpentMs: ans?.timeSpentMs ?? 0,
        medianTimeMs,
        validAttemptsCount: validCount,
      };
    })
  );

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

import { getCurrentUser } from "@/lib/auth";
import { getAttemptById, getAnswersForAttempt } from "@/lib/attemptStore";
import { getTestById } from "@/config/testhub";
import { getQuestionsForTest } from "@/config/mockQuestions";
import { getAllSubmittedAnswersForQuestion } from "@/lib/attemptStore";

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

  const attempt = getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (attempt.status !== "SUBMITTED") {
    return Response.json({ error: "Attempt not yet submitted" }, { status: 400 });
  }

  const test = getTestById(attempt.testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const questions = getQuestionsForTest(test.id, test.questions);
  const answers = getAnswersForAttempt(attemptId);
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const reviewQuestions = questions.map((q) => {
    const ans = answerMap.get(q.id);
    const allSubmitted = getAllSubmittedAnswersForQuestion(q.id);
    const validCount = allSubmitted.length;

    let medianTimeMs: number | null = null;
    if (validCount >= 20) {
      const times = allSubmitted.map((a) => a.timeSpentMs).sort((a, b) => a - b);
      const mid = Math.floor(times.length / 2);
      medianTimeMs = times.length % 2 === 0
        ? Math.round((times[mid - 1] + times[mid]) / 2)
        : times[mid];
    }

    return {
      questionId: q.id,
      order: q.order,
      subjectName: q.subjectName,
      questionText_en: q.questionText_en,
      questionText_te: q.questionText_te,
      options_en: [
        { key: "A", text: q.optionA_en },
        { key: "B", text: q.optionB_en },
        { key: "C", text: q.optionC_en },
        { key: "D", text: q.optionD_en },
      ],
      options_te: [
        { key: "A", text: q.optionA_te },
        { key: "B", text: q.optionB_te },
        { key: "C", text: q.optionC_te },
        { key: "D", text: q.optionD_te },
      ],
      correctOption: q.correctOption,
      explanation_en: `The correct answer is Option ${q.correctOption}. This is the standard explanation for question ${q.order}.`,
      explanation_te: `సరైన సమాధానం ఎంపిక ${q.correctOption}. ఇది ప్రశ్న ${q.order} కోసం ప్రామాణిక వివరణ.`,
      userSelectedOption: ans?.selectedOption ?? null,
      isMarkedForReview: ans?.isMarkedForReview ?? false,
      timeSpentMs: ans?.timeSpentMs ?? 0,
      medianTimeMs,
      validAttemptsCount: validCount,
    };
  });

  return Response.json({
    testMeta: {
      id: test.id,
      name: test.title,
      code: test.testCode,
      totalQuestions: test.questions,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarks: test.negativeMarks,
    },
    attemptMeta: {
      attemptId: attempt.attemptId,
      language: attempt.language,
      submittedAt: attempt.submittedAt,
    },
    questions: reviewQuestions,
  });
}

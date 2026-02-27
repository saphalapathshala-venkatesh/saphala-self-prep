import { getCurrentUser } from "@/lib/auth";
import { getTestById } from "@/config/testhub";
import { getActiveAttempt, getAnswersForAttempt } from "@/lib/attemptStore";
import { getQuestionsForTest } from "@/config/mockQuestions";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { testId } = await params;
  const test = getTestById(testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const attempt = getActiveAttempt(user.id, testId);
  if (!attempt) {
    return Response.json({ error: "No active attempt found" }, { status: 404 });
  }

  const questions = getQuestionsForTest(testId, test.questions);
  const savedAnswers = getAnswersForAttempt(attempt.attemptId);

  return Response.json({
    test: {
      id: test.id,
      name: test.title,
      code: test.testCode,
      durationMinutes: test.duration,
      totalQuestions: test.questions,
      negativeMarking: test.negativeMarks,
      marksPerQuestion: test.marksPerQuestion,
    },
    attempt: {
      attemptId: attempt.attemptId,
      language: attempt.language,
      endsAt: attempt.endsAt,
      status: attempt.status,
    },
    questions: questions.map((q) => ({
      id: q.id,
      order: q.order,
      questionText_en: q.questionText_en,
      questionText_te: q.questionText_te,
      optionA_en: q.optionA_en,
      optionA_te: q.optionA_te,
      optionB_en: q.optionB_en,
      optionB_te: q.optionB_te,
      optionC_en: q.optionC_en,
      optionC_te: q.optionC_te,
      optionD_en: q.optionD_en,
      optionD_te: q.optionD_te,
    })),
    savedAnswers: savedAnswers.map((a) => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isMarkedForReview: a.isMarkedForReview,
      timeSpentMs: a.timeSpentMs,
    })),
  });
}

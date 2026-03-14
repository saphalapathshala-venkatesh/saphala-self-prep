import { getCurrentUserAndSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getDbTestById,
  getDbQuestionsForTest,
  getActiveAttempt,
  getAnswersForAttempt,
  lockAttemptSession,
  optionIdToLetter,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const auth = await getCurrentUserAndSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, sessionToken } = auth;

  const { testId } = await params;
  const test = await getDbTestById(testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const attempt = await getActiveAttempt(user.id, testId);
  if (!attempt) {
    return Response.json({ error: "No active attempt found" }, { status: 404 });
  }

  // Concurrent access protection: block if another active session holds the lock
  if (attempt.lockedSessionToken && attempt.lockedSessionToken !== sessionToken) {
    const lockingSession = await prisma.session.findFirst({
      where: { id: attempt.lockedSessionToken, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (lockingSession) {
      return Response.json(
        {
          error: "This test is already open on another device. Close it there first, then reload this page.",
          code: "ATTEMPT_LOCKED",
        },
        { status: 409 }
      );
    }
  }
  // Acquire (or refresh) the session lock
  await lockAttemptSession(attempt.id, sessionToken);

  const questions = await getDbQuestionsForTest(testId);
  const savedAnswers = await getAnswersForAttempt(attempt.id);

  const optionsByQuestion = new Map(
    questions.map((q) => [q.id, q.options.map((o) => ({ id: o.id }))])
  );

  return Response.json({
    test: {
      id: test.id,
      name: test.title,
      code: test.code,
      durationMinutes: test.durationMinutes,
      totalQuestions: test.totalQuestions,
      negativeMarking: test.negativeMarks,
      marksPerQuestion: test.marksPerQuestion,
    },
    attempt: {
      attemptId: attempt.id,
      language: attempt.language,
      endsAt: attempt.endsAt,
      status: attempt.status,
    },
    questions: questions.map((q) => ({
      id: q.id,
      order: q.order,
      questionText_en: q.questionText_en,
      questionText_te: q.questionText_te,
      optionA_en: q.options[0]?.textEn || null,
      optionA_te: q.options[0]?.textTe || null,
      optionB_en: q.options[1]?.textEn || null,
      optionB_te: q.options[1]?.textTe || null,
      optionC_en: q.options[2]?.textEn || null,
      optionC_te: q.options[2]?.textTe || null,
      optionD_en: q.options[3]?.textEn || null,
      optionD_te: q.options[3]?.textTe || null,
    })),
    savedAnswers: savedAnswers.map((a) => {
      const opts = optionsByQuestion.get(a.questionId) || [];
      const letter = a.selectedOptionId
        ? optionIdToLetter(a.selectedOptionId, opts)
        : null;

      return {
        questionId: a.questionId,
        selectedOption: letter,
        isMarkedForReview: a.isMarkedForReview,
        timeSpentMs: a.timeSpentMs,
      };
    }),
  });
}

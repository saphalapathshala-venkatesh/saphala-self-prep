import { getStudentSession } from "@/lib/studentAuth";
import { prisma } from "@/lib/db";
import {
  getAttemptById,
  getAnswersForAttempt,
  lockAttemptSession,
  optionIdToLetter,
  getDbQuestionsForTest,
  getPauseEvents,
  computeTotalPausedMs,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getStudentSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, sessionToken } = auth;
  const { id: attemptId } = await params;

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Concurrent access check — only enforce for IN_PROGRESS attempts
  if (attempt.status === "IN_PROGRESS" && attempt.lockedSessionToken && attempt.lockedSessionToken !== sessionToken) {
    const lockingSession = await prisma.session.findFirst({
      where: { id: attempt.lockedSessionToken, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (lockingSession) {
      return Response.json(
        { error: "This test is already open on another device.", code: "ATTEMPT_LOCKED" },
        { status: 409 }
      );
    }
  }

  // Acquire / refresh session lock for in-flight attempts only
  if (attempt.status === "IN_PROGRESS") {
    await lockAttemptSession(attemptId, sessionToken);
  }

  const [savedAnswers, questions, pauseEvents] = await Promise.all([
    getAnswersForAttempt(attemptId),
    getDbQuestionsForTest(attempt.testId),
    getPauseEvents(attemptId),
  ]);

  const now = new Date();
  const currentlyPaused = attempt.status === "PAUSED";

  // Sum all CLOSED pause events; if currently paused, include live running duration too
  const totalPausedMs = computeTotalPausedMs(
    pauseEvents,
    currentlyPaused ? now : undefined
  );

  // If currently paused, find the open pause event's timestamp
  const openEvent = currentlyPaused
    ? pauseEvents.find((e) => e.resumedAt === null)
    : null;

  const optionsByQuestion = new Map(
    questions.map((q) => [q.id, q.options.map((o) => ({ id: o.id }))])
  );

  return Response.json({
    id: attempt.id,
    testId: attempt.testId,
    status: attempt.status,
    language: attempt.language,
    startedAt: attempt.startedAt,
    endsAt: attempt.endsAt,
    submittedAt: attempt.submittedAt,
    currentlyPaused,
    totalPausedMs,
    lastPausedAt: openEvent?.pausedAt?.toISOString() ?? null,
    answers: savedAnswers.map((a) => {
      const opts = optionsByQuestion.get(a.questionId) ?? [];
      return {
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId ?? null,
        selectedOption: a.selectedOptionId
          ? optionIdToLetter(a.selectedOptionId, opts)
          : null,
        isMarkedForReview: a.isMarkedForReview,
        timeSpentMs: a.timeSpentMs,
      };
    }),
  });
}

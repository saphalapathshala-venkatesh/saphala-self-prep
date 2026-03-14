import { getCurrentUserAndSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAttemptById, upsertAnswer, resolveOptionIdFromLetter } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getCurrentUserAndSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, sessionToken } = auth;

  const body = await request.json();
  const { attemptId, questionId, selectedOption, isMarkedForReview, timeSpentMsDelta } = body;

  if (!attemptId || !questionId) {
    return Response.json({ error: "attemptId and questionId are required" }, { status: 400 });
  }

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return Response.json({ error: "Attempt already submitted" }, { status: 400 });
  }

  // Concurrent access protection
  if (attempt.lockedSessionToken && attempt.lockedSessionToken !== sessionToken) {
    const lockingSession = await prisma.session.findFirst({
      where: { id: attempt.lockedSessionToken, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (lockingSession) {
      return Response.json(
        { error: "This test is being accessed from another device.", code: "ATTEMPT_LOCKED" },
        { status: 409 }
      );
    }
  }

  let resolvedOptionId: string | null = null;
  if (selectedOption) {
    resolvedOptionId = await resolveOptionIdFromLetter(questionId, selectedOption);
  }

  const answer = await upsertAnswer(
    attemptId,
    questionId,
    resolvedOptionId,
    isMarkedForReview ?? false,
    timeSpentMsDelta ?? 0
  );

  return Response.json({
    success: true,
    answer: {
      questionId: answer.questionId,
      selectedOption: selectedOption ?? null,
      isMarkedForReview: answer.isMarkedForReview,
      savedAt: answer.savedAt,
    },
  });
}

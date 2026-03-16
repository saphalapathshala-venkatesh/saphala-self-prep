import { getStudentSession } from "@/lib/studentAuth";
import { prisma } from "@/lib/db";
import { getAttemptById, upsertAnswer } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getStudentSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, sessionToken } = auth;
  const { id: attemptId } = await params;

  const body = await request.json().catch(() => ({}));
  const { questionId, selectedOptionId, isMarkedForReview, timeSpentMsDelta } =
    body as {
      questionId?: string;
      selectedOptionId?: string | null;
      isMarkedForReview?: boolean;
      timeSpentMsDelta?: number;
    };

  if (!attemptId || !questionId) {
    return Response.json({ error: "questionId is required" }, { status: 400 });
  }

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return Response.json({ error: "Attempt is not in progress" }, { status: 400 });
  }

  // Concurrent access check
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

  const answer = await upsertAnswer(
    attemptId,
    questionId,
    selectedOptionId ?? null,
    isMarkedForReview ?? false,
    timeSpentMsDelta ?? 0
  );

  return Response.json({
    success: true,
    answer: {
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      isMarkedForReview: answer.isMarkedForReview,
      savedAt: answer.savedAt,
    },
  });
}

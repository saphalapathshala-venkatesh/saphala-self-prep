import { getStudentSession } from "@/lib/studentAuth";
import { prisma } from "@/lib/db";
import {
  getAttemptById,
  submitAttempt,
  bulkUpsertAnswers,
} from "@/lib/testhubDb";

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

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Block submit while paused — require resume first
  if (attempt.status === "PAUSED") {
    return Response.json(
      { error: "Cannot submit while the test is paused. Resume it first.", code: "ATTEMPT_PAUSED" },
      { status: 400 }
    );
  }

  if (attempt.status !== "IN_PROGRESS") {
    return Response.json({ error: "Attempt is not in progress." }, { status: 400 });
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

  const body = await request.json().catch(() => ({}));
  const { finalAnswers } = body as {
    finalAnswers?: Array<{
      questionId: string;
      selectedOptionId: string | null;
      isMarkedForReview: boolean;
      timeSpentMs: number;
    }>;
  };

  // Flush any unsaved answers before submitting
  if (Array.isArray(finalAnswers) && finalAnswers.length > 0) {
    await bulkUpsertAnswers(
      attemptId,
      finalAnswers.map((fa) => ({
        questionId: fa.questionId,
        selectedOptionId: fa.selectedOptionId ?? null,
        isMarkedForReview: fa.isMarkedForReview,
        timeSpentMs: fa.timeSpentMs,
      }))
    );
  }

  const submitted = await submitAttempt(attemptId);

  return Response.json({
    success: true,
    attemptId: submitted.id,
    submittedAt: submitted.submittedAt,
  });
}

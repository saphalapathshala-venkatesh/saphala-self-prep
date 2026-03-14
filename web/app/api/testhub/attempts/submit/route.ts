import { getCurrentUserAndSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getAttemptById,
  submitAttempt,
  bulkUpsertAnswers,
  resolveOptionIdFromLetter,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getCurrentUserAndSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user, sessionToken } = auth;

  const body = await request.json();
  const { attemptId, finalAnswers } = body;

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

  if (attempt.status !== "IN_PROGRESS") {
    return Response.json({ error: "Attempt already submitted" }, { status: 400 });
  }

  // Concurrent access protection: block submission from a different active session
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

  if (finalAnswers && Array.isArray(finalAnswers) && finalAnswers.length > 0) {
    const resolved = await Promise.all(
      finalAnswers.map(async (fa: { questionId: string; selectedOption: string | null; isMarkedForReview: boolean; timeSpentMs: number }) => {
        let optionId: string | null = null;
        if (fa.selectedOption) {
          optionId = await resolveOptionIdFromLetter(fa.questionId, fa.selectedOption);
        }
        return {
          questionId: fa.questionId,
          selectedOptionId: optionId,
          isMarkedForReview: fa.isMarkedForReview,
          timeSpentMs: fa.timeSpentMs,
        };
      })
    );
    await bulkUpsertAnswers(attemptId, resolved);
  }

  const submitted = await submitAttempt(attemptId);

  return Response.json({
    success: true,
    attemptId: submitted.id,
    submittedAt: submitted.submittedAt,
  });
}

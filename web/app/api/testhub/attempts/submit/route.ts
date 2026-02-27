import { getCurrentUser } from "@/lib/auth";
import {
  getAttemptById,
  submitAttempt,
  bulkUpsertAnswers,
  resolveOptionIdFromLetter,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

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

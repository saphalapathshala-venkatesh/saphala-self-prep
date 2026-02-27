import { getCurrentUser } from "@/lib/auth";
import { getAttemptById, upsertAnswer, resolveOptionIdFromLetter } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

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

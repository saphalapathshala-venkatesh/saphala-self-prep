import { getCurrentUser } from "@/lib/auth";
import { getAttemptById, submitAttempt, bulkUpsertAnswers } from "@/lib/attemptStore";

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

  const attempt = getAttemptById(attemptId);
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
    bulkUpsertAnswers(attemptId, finalAnswers);
  }

  const submitted = submitAttempt(attemptId);

  return Response.json({
    success: true,
    attemptId: submitted?.attemptId,
    submittedAt: submitted?.submittedAt,
  });
}

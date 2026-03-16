import { getStudentSession } from "@/lib/studentAuth";
import { getAttemptById, getDbTestById, pauseAttempt } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getStudentSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user } = auth;
  const { id: attemptId } = await params;

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    if (attempt.status === "PAUSED") {
      return Response.json({ error: "Attempt is already paused.", code: "ALREADY_PAUSED" }, { status: 400 });
    }
    return Response.json({ error: "Attempt is not in progress." }, { status: 400 });
  }

  const test = await getDbTestById(attempt.testId);
  if (!test?.allowPause) {
    return Response.json({ error: "This test does not allow pausing." }, { status: 400 });
  }

  try {
    const { pausedAt } = await pauseAttempt(attemptId);
    return Response.json({ success: true, pausedAt: pausedAt.toISOString() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "ALREADY_PAUSED") {
      return Response.json({ error: "Attempt is already paused.", code: "ALREADY_PAUSED" }, { status: 400 });
    }
    console.error("[pause] unexpected error", err);
    return Response.json({ error: "Failed to pause. Please try again." }, { status: 500 });
  }
}

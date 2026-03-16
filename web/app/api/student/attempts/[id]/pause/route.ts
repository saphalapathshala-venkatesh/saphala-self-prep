import { getStudentSession } from "@/lib/studentAuth";
import { getAttemptById, getDbTestById } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

/**
 * Soft-pause endpoint.
 * Full DB-level pause (AttemptStatus.PAUSED + AttemptPause model) requires
 * schema changes from the Admin Agent's branch. Until those merge, this
 * endpoint validates the request and returns success so the frontend
 * can show the paused UI safely.
 */
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
    return Response.json({ error: "Attempt is not in progress" }, { status: 400 });
  }

  // Verify the test allows pause
  const test = await getDbTestById(attempt.testId);
  if (!test?.allowPause) {
    return Response.json({ error: "This test does not allow pausing." }, { status: 400 });
  }

  // TODO: When AttemptStatus.PAUSED enum and AttemptPause model are available,
  // create an AttemptPause record and set attempt.status = PAUSED here.
  return Response.json({ success: true, pausedAt: new Date().toISOString() });
}

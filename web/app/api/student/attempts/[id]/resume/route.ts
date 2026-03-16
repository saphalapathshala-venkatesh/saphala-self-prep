import { getStudentSession } from "@/lib/studentAuth";
import { getAttemptById } from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

/**
 * Resume endpoint.
 * Paired with pause. Until the full AttemptPause schema merges,
 * this validates the attempt and returns success.
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

  // TODO: When AttemptPause model is available, close the open pause event here.
  return Response.json({ success: true, resumedAt: new Date().toISOString() });
}

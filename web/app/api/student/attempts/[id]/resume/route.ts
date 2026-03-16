import { getStudentSession } from "@/lib/studentAuth";
import { getAttemptById, resumeAttempt } from "@/lib/testhubDb";

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
  if (attempt.status !== "PAUSED") {
    return Response.json({ error: "Attempt is not paused." }, { status: 400 });
  }

  try {
    const { attempt: updated, resumedAt } = await resumeAttempt(attemptId);
    return Response.json({
      success: true,
      resumedAt: resumedAt.toISOString(),
      endsAt: updated.endsAt?.toISOString() ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NOT_PAUSED") {
      return Response.json({ error: "No open pause event found." }, { status: 400 });
    }
    console.error("[resume] unexpected error", err);
    return Response.json({ error: "Failed to resume. Please try again." }, { status: 500 });
  }
}

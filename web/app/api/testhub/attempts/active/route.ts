import { getCurrentUser } from "@/lib/auth";
import { getActiveAttempt, getAttemptsForUserTest } from "@/lib/attemptStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");

  if (!testId) {
    return Response.json({ error: "testId is required" }, { status: 400 });
  }

  const active = getActiveAttempt(user.id, testId);
  const allAttempts = getAttemptsForUserTest(user.id, testId);

  return Response.json({
    activeAttempt: active
      ? { attemptId: active.attemptId, language: active.language, attemptNumber: active.attemptNumber }
      : null,
    attemptsUsed: allAttempts.length,
  });
}

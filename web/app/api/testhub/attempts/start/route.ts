import { getCurrentUser } from "@/lib/auth";
import { getTestById } from "@/config/testhub";
import { getActiveAttempt, getAttemptsForUserTest, createAttempt } from "@/lib/attemptStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { testId, language } = body;

  if (!testId || !language) {
    return Response.json({ error: "testId and language are required" }, { status: 400 });
  }

  if (!["EN", "TE"].includes(language)) {
    return Response.json({ error: "Invalid language. Use EN or TE." }, { status: 400 });
  }

  const test = getTestById(testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  if (test.accessType === "LOCKED") {
    return Response.json({ error: "This test requires a premium plan." }, { status: 403 });
  }

  const active = getActiveAttempt(user.id, testId);
  if (active) {
    return Response.json({
      attemptId: active.attemptId,
      status: active.status,
      language: active.language,
      testId,
      resumed: true,
    });
  }

  const allAttempts = getAttemptsForUserTest(user.id, testId);
  if (allAttempts.length >= test.attemptsAllowed) {
    return Response.json(
      { error: `No attempts left for this test. You have used all ${test.attemptsAllowed} attempts.` },
      { status: 403 }
    );
  }

  const attempt = createAttempt(user.id, testId, language as "EN" | "TE");

  return Response.json({
    attemptId: attempt.attemptId,
    status: attempt.status,
    language: attempt.language,
    testId,
    resumed: false,
  });
}

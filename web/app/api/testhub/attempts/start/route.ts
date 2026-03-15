import { getCurrentUser } from "@/lib/auth";
import {
  getDbTestById,
  getActiveAttempt,
  getAttemptsForUserTest,
  createAttempt,
} from "@/lib/testhubDb";

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

  const test = await getDbTestById(testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  // Guard: test must be published
  if (!test.isPublished) {
    return Response.json({ error: "Test is not available." }, { status: 404 });
  }

  // Guard: if the test belongs to a series, that series must also be published
  if (test.seriesIsPublished === false) {
    return Response.json({ error: "Test is not available." }, { status: 404 });
  }

  if (test.accessType === "LOCKED") {
    return Response.json({ error: "This test requires a premium plan." }, { status: 403 });
  }

  const active = await getActiveAttempt(user.id, testId);
  if (active) {
    return Response.json({
      attemptId: active.id,
      status: active.status,
      language: active.language,
      testId,
      resumed: true,
    });
  }

  const allAttempts = await getAttemptsForUserTest(user.id, testId);
  if (allAttempts.length >= test.attemptsAllowed) {
    return Response.json(
      { error: `No attempts left for this test. You have used all ${test.attemptsAllowed} attempts.` },
      { status: 403 }
    );
  }

  const attempt = await createAttempt(user.id, testId, language as "EN" | "TE", test.durationMinutes);

  return Response.json({
    attemptId: attempt.id,
    status: attempt.status,
    language: attempt.language,
    testId,
    resumed: false,
  });
}

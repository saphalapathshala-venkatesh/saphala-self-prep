import { getStudentSession } from "@/lib/studentAuth";
import {
  getDbTestById,
  getActiveAttempt,
  getAttemptsForUserTest,
  createAttempt,
  resolveTestAccess,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getStudentSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  const { testId, language } = body as { testId?: string; language?: string };

  if (!testId) {
    return Response.json({ error: "testId is required" }, { status: 400 });
  }

  const lang: "EN" | "TE" =
    language === "TE" ? "TE" : "EN";

  const test = await getDbTestById(testId);
  if (!test || !test.isPublished) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }
  if (test.seriesIsPublished === false) {
    return Response.json({ error: "Test is not available." }, { status: 404 });
  }
  if (test.scheduledUntil) {
    return Response.json({ error: "This test is not yet available." }, { status: 403 });
  }

  const access = await resolveTestAccess(test, user.id);
  if (access === "locked") {
    return Response.json({ error: "This test requires a premium plan." }, { status: 403 });
  }

  // Resume active attempt if one exists
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

  // Check attempts quota
  const allAttempts = await getAttemptsForUserTest(user.id, testId);
  if (allAttempts.length >= test.attemptsAllowed) {
    return Response.json(
      { error: `No attempts left. You have used all ${test.attemptsAllowed} attempts.` },
      { status: 403 }
    );
  }

  const attempt = await createAttempt(user.id, testId, lang, test.durationMinutes);

  return Response.json({
    attemptId: attempt.id,
    status: attempt.status,
    language: attempt.language,
    testId,
    resumed: false,
  });
}

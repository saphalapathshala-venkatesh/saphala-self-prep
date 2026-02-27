import { getCurrentUser } from "@/lib/auth";
import { saveQuestionReport } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { attemptId, questionId, issueType, message } = body;

  if (!attemptId || !questionId || !issueType) {
    return Response.json({ error: "attemptId, questionId, and issueType are required" }, { status: 400 });
  }

  const validTypes = ["incorrect_answer_key", "question_unclear", "translation_issue", "explanation_issue", "other"];
  if (!validTypes.includes(issueType)) {
    return Response.json({ error: "Invalid issueType" }, { status: 400 });
  }

  saveQuestionReport({
    userId: user.id,
    attemptId,
    questionId,
    issueType,
    message: message || "",
  });

  return Response.json({ ok: true });
}

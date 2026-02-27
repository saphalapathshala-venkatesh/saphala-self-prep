import { getCurrentUser } from "@/lib/auth";
import {
  getAttemptById,
  getAnswersForAttempt,
  getDbTestById,
  getDbQuestionsForTest,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attemptId");

  if (!attemptId) {
    return Response.json({ error: "attemptId is required" }, { status: 400 });
  }

  const attempt = await getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (attempt.status !== "SUBMITTED") {
    return Response.json({ error: "Attempt not yet submitted" }, { status: 400 });
  }

  const test = await getDbTestById(attempt.testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const questions = await getDbQuestionsForTest(attempt.testId);
  const answers = await getAnswersForAttempt(attemptId);

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  let answeredCount = 0;
  let unattemptedCount = 0;
  let markedOnlyCount = 0;
  let answeredAndMarkedCount = 0;
  let notVisitedCount = 0;

  const subjectCounts: Record<
    string,
    {
      subjectId: string;
      subjectName: string;
      answered: number;
      unattempted: number;
      markedOnly: number;
      answeredAndMarked: number;
      notVisited: number;
    }
  > = {};

  for (const q of questions) {
    const sid = q.subjectId || "general";
    const sname = q.subjectName || "General";

    if (!subjectCounts[sid]) {
      subjectCounts[sid] = {
        subjectId: sid,
        subjectName: sname,
        answered: 0,
        unattempted: 0,
        markedOnly: 0,
        answeredAndMarked: 0,
        notVisited: 0,
      };
    }

    const sub = subjectCounts[sid];
    const ans = answerMap.get(q.id);

    if (!ans) {
      notVisitedCount++;
      sub.notVisited++;
    } else if (ans.selectedOptionId !== null && ans.isMarkedForReview) {
      answeredAndMarkedCount++;
      sub.answeredAndMarked++;
    } else if (ans.selectedOptionId !== null && !ans.isMarkedForReview) {
      answeredCount++;
      sub.answered++;
    } else if (ans.selectedOptionId === null && ans.isMarkedForReview) {
      markedOnlyCount++;
      sub.markedOnly++;
    } else {
      unattemptedCount++;
      sub.unattempted++;
    }
  }

  return Response.json({
    attempt: {
      attemptId: attempt.id,
      testId: attempt.testId,
      submittedAt: attempt.submittedAt,
      startedAt: attempt.startedAt,
      endsAt: attempt.endsAt,
      language: attempt.language,
    },
    totalQuestions: questions.length,
    durationMinutes: test.durationMinutes,
    overall: {
      answeredCount,
      unattemptedCount,
      markedOnlyCount,
      answeredAndMarkedCount,
      notVisitedCount,
    },
    subjectWise: Object.values(subjectCounts),
  });
}

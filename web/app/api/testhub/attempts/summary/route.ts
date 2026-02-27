import { getCurrentUser } from "@/lib/auth";
import { getAttemptById, getAnswersForAttempt } from "@/lib/attemptStore";
import { getTestById } from "@/config/testhub";
import { getQuestionsForTest } from "@/config/mockQuestions";

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

  const attempt = getAttemptById(attemptId);
  if (!attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.userId !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (attempt.status !== "SUBMITTED") {
    return Response.json({ error: "Attempt not yet submitted" }, { status: 400 });
  }

  const test = getTestById(attempt.testId);
  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const questions = getQuestionsForTest(attempt.testId, test.questions);
  const answers = getAnswersForAttempt(attemptId);

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
    if (!subjectCounts[q.subjectId]) {
      subjectCounts[q.subjectId] = {
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        answered: 0,
        unattempted: 0,
        markedOnly: 0,
        answeredAndMarked: 0,
        notVisited: 0,
      };
    }

    const sub = subjectCounts[q.subjectId];
    const ans = answerMap.get(q.id);

    if (!ans) {
      notVisitedCount++;
      sub.notVisited++;
    } else if (ans.selectedOption !== null && ans.isMarkedForReview) {
      answeredAndMarkedCount++;
      sub.answeredAndMarked++;
    } else if (ans.selectedOption !== null && !ans.isMarkedForReview) {
      answeredCount++;
      sub.answered++;
    } else if (ans.selectedOption === null && ans.isMarkedForReview) {
      markedOnlyCount++;
      sub.markedOnly++;
    } else {
      unattemptedCount++;
      sub.unattempted++;
    }
  }

  return Response.json({
    attempt: {
      attemptId: attempt.attemptId,
      testId: attempt.testId,
      submittedAt: attempt.submittedAt,
      startedAt: attempt.startedAt,
      endsAt: attempt.endsAt,
      language: attempt.language,
    },
    totalQuestions: questions.length,
    durationMinutes: test.duration,
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

export interface MockAttempt {
  attemptId: string;
  userId: string;
  testId: string;
  language: "EN" | "TE";
  status: "IN_PROGRESS" | "SUBMITTED";
  attemptNumber: number;
  startedAt: string;
  endsAt: string;
  submittedAt: string | null;
}

export interface MockAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOption: string | null;
  isMarkedForReview: boolean;
  timeSpentMs: number;
  savedAt: string | null;
}

const attempts: Map<string, MockAttempt> = new Map();
const answers: Map<string, MockAttemptAnswer> = new Map();

export function getAttemptsForUserTest(userId: string, testId: string): MockAttempt[] {
  const results: MockAttempt[] = [];
  for (const a of attempts.values()) {
    if (a.userId === userId && a.testId === testId) {
      results.push(a);
    }
  }
  return results;
}

export function getActiveAttempt(userId: string, testId: string): MockAttempt | null {
  for (const a of attempts.values()) {
    if (a.userId === userId && a.testId === testId && a.status === "IN_PROGRESS") {
      return a;
    }
  }
  return null;
}

export function createAttempt(
  userId: string,
  testId: string,
  language: "EN" | "TE",
  durationMinutes: number
): MockAttempt {
  const all = getAttemptsForUserTest(userId, testId);
  const attemptNumber = all.length + 1;
  const attemptId = `attempt_${userId}_${testId}_${Date.now()}`;
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

  const attempt: MockAttempt = {
    attemptId,
    userId,
    testId,
    language,
    status: "IN_PROGRESS",
    attemptNumber,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    submittedAt: null,
  };

  attempts.set(attemptId, attempt);
  return attempt;
}

export function getAttemptById(attemptId: string): MockAttempt | null {
  return attempts.get(attemptId) ?? null;
}

export function submitAttempt(attemptId: string): MockAttempt | null {
  const attempt = attempts.get(attemptId);
  if (!attempt) return null;
  attempt.status = "SUBMITTED";
  attempt.submittedAt = new Date().toISOString();
  return attempt;
}

function answerKey(attemptId: string, questionId: string): string {
  return `${attemptId}::${questionId}`;
}

export function upsertAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: string | null,
  isMarkedForReview: boolean,
  timeSpentMsDelta: number
): MockAttemptAnswer {
  const key = answerKey(attemptId, questionId);
  const existing = answers.get(key);

  if (existing) {
    existing.selectedOption = selectedOption;
    existing.isMarkedForReview = isMarkedForReview;
    existing.timeSpentMs += timeSpentMsDelta;
    existing.savedAt = new Date().toISOString();
    return existing;
  }

  const answer: MockAttemptAnswer = {
    id: `ans_${attemptId}_${questionId}_${Date.now()}`,
    attemptId,
    questionId,
    selectedOption,
    isMarkedForReview,
    timeSpentMs: timeSpentMsDelta,
    savedAt: new Date().toISOString(),
  };

  answers.set(key, answer);
  return answer;
}

export function getAnswersForAttempt(attemptId: string): MockAttemptAnswer[] {
  const results: MockAttemptAnswer[] = [];
  for (const a of answers.values()) {
    if (a.attemptId === attemptId) {
      results.push(a);
    }
  }
  return results;
}

export function getAllSubmittedAnswersForQuestion(questionId: string): MockAttemptAnswer[] {
  const result: MockAttemptAnswer[] = [];
  for (const a of answers.values()) {
    if (a.questionId !== questionId) continue;
    const attempt = attempts.get(a.attemptId);
    if (attempt && attempt.status === "SUBMITTED") {
      result.push(a);
    }
  }
  return result;
}

export function bulkUpsertAnswers(
  attemptId: string,
  finalAnswers: Array<{
    questionId: string;
    selectedOption: string | null;
    isMarkedForReview: boolean;
    timeSpentMs: number;
  }>
): void {
  for (const fa of finalAnswers) {
    const key = answerKey(attemptId, fa.questionId);
    const existing = answers.get(key);

    if (existing) {
      existing.selectedOption = fa.selectedOption;
      existing.isMarkedForReview = fa.isMarkedForReview;
      existing.timeSpentMs = fa.timeSpentMs;
      existing.savedAt = new Date().toISOString();
    } else {
      answers.set(key, {
        id: `ans_${attemptId}_${fa.questionId}_${Date.now()}`,
        attemptId,
        questionId: fa.questionId,
        selectedOption: fa.selectedOption,
        isMarkedForReview: fa.isMarkedForReview,
        timeSpentMs: fa.timeSpentMs,
        savedAt: new Date().toISOString(),
      });
    }
  }
}

export interface MockAttempt {
  attemptId: string;
  userId: string;
  testId: string;
  language: "EN" | "TE";
  status: "IN_PROGRESS" | "SUBMITTED";
  attemptNumber: number;
  startedAt: string;
}

const attempts: Map<string, MockAttempt> = new Map();

function userTestKey(userId: string, testId: string) {
  return `${userId}::${testId}`;
}

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

export function createAttempt(userId: string, testId: string, language: "EN" | "TE"): MockAttempt {
  const all = getAttemptsForUserTest(userId, testId);
  const attemptNumber = all.length + 1;
  const attemptId = `attempt_${userId}_${testId}_${Date.now()}`;

  const attempt: MockAttempt = {
    attemptId,
    userId,
    testId,
    language,
    status: "IN_PROGRESS",
    attemptNumber,
    startedAt: new Date().toISOString(),
  };

  attempts.set(attemptId, attempt);
  return attempt;
}

export function getAttemptById(attemptId: string): MockAttempt | null {
  return attempts.get(attemptId) ?? null;
}

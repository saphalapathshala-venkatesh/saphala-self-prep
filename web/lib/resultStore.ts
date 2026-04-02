export interface SubjectBreakdown {
  subjectId: string;
  subjectName: string;
  grossMarks: number;
  negativeMarks: number;
  netMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeUsedMs: number;
}

export interface MockResult {
  resultId: string;
  attemptId: string;
  testId: string;
  userId: string;
  grossMarksTotal: number;
  negativeMarksTotal: number;
  netMarksTotal: number;
  maxMarks: number;
  accuracyPercent: number;
  totalTimeUsedMs: number;
  rank: number | null;
  percentile: number | null;
  xpEarned: number;
  subjectBreakdown: SubjectBreakdown[];
  createdAt: string;
}

const results: Map<string, MockResult> = new Map();
const userXp: Map<string, number> = new Map();

export function getResultByAttemptId(attemptId: string): MockResult | null {
  for (const r of results.values()) {
    if (r.attemptId === attemptId) return r;
  }
  return null;
}

export function getAllResultsForTest(testId: string): MockResult[] {
  const out: MockResult[] = [];
  for (const r of results.values()) {
    if (r.testId === testId) out.push(r);
  }
  return out;
}

export function saveResult(result: MockResult): void {
  results.set(result.resultId, result);
}

export function getUserTotalXp(userId: string): number {
  return userXp.get(userId) ?? 0;
}

export function addUserXp(userId: string, xp: number): number {
  const current = userXp.get(userId) ?? 0;
  const updated = current + xp;
  userXp.set(userId, updated);
  return updated;
}

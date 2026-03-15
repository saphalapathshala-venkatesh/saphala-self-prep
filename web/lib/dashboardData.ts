import { prisma } from "./db";
import { getPublishedTestsForStudent, type StudentTestItem } from "./testhubDb";

export interface DashboardAttempt {
  id: string;
  testId: string;
  testTitle: string;
  category: string | null;
  attemptNumber: number;
  language: string;
  startedAt: Date;
  submittedAt: Date | null;
  endsAt: Date | null;
  scorePct: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  isScored: boolean;
}

export interface ActiveAttempt {
  id: string;
  testId: string;
  testTitle: string;
  endsAt: Date | null;
  startedAt: Date;
}

export interface DashboardData {
  attemptCount: number;
  recentAttempts: DashboardAttempt[];
  activeAttempt: ActiveAttempt | null;
  xpTotal: number;
  xpHasLedger: boolean;
  accuracyPct: number | null;
  freeTests: StudentTestItem[];
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    attemptCount,
    recentAttemptsRaw,
    activeAttemptRaw,
    xpAgg,
    scoredAttemptsRaw,
    allFreeTests,
  ] = await Promise.all([
    prisma.attempt.count({ where: { userId, status: "SUBMITTED" } }),
    prisma.attempt.findMany({
      where: { userId, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        test: {
          select: {
            title: true,
            categoryId: true,
            series: { select: { categoryId: true } },
          },
        },
      },
    }),
    prisma.attempt.findFirst({
      where: {
        userId,
        status: "IN_PROGRESS",
        endsAt: { gt: new Date() },
      },
      orderBy: { startedAt: "desc" },
      include: { test: { select: { title: true } } },
    }),
    prisma.xpLedgerEntry.aggregate({
      where: { userId },
      _sum: { delta: true },
    }),
    prisma.attempt.findMany({
      where: {
        userId,
        status: "SUBMITTED",
        OR: [{ correctCount: { gt: 0 } }, { wrongCount: { gt: 0 } }],
      },
      select: { correctCount: true, wrongCount: true },
    }),
    getPublishedTestsForStudent(userId),
  ]);

  const xpTotal = xpAgg._sum.delta ?? 0;
  const xpHasLedger = xpAgg._sum.delta !== null;

  let accuracyPct: number | null = null;
  if (scoredAttemptsRaw.length > 0) {
    const totalCorrect = scoredAttemptsRaw.reduce((s, a) => s + a.correctCount, 0);
    const totalAnswered = scoredAttemptsRaw.reduce(
      (s, a) => s + a.correctCount + a.wrongCount,
      0
    );
    if (totalAnswered > 0) {
      accuracyPct = Math.round((totalCorrect / totalAnswered) * 10000) / 100;
    }
  }

  const recentAttempts: DashboardAttempt[] = recentAttemptsRaw.map((a) => ({
    id: a.id,
    testId: a.testId,
    testTitle: a.test.title,
    category: a.test.series?.categoryId ?? a.test.categoryId ?? null,
    attemptNumber: a.attemptNumber,
    language: a.language,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    endsAt: a.endsAt,
    scorePct: a.scorePct,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    unansweredCount: a.unansweredCount,
    isScored: a.correctCount > 0 || a.wrongCount > 0,
  }));

  const activeAttempt: ActiveAttempt | null = activeAttemptRaw
    ? {
        id: activeAttemptRaw.id,
        testId: activeAttemptRaw.testId,
        testTitle: activeAttemptRaw.test.title,
        endsAt: activeAttemptRaw.endsAt,
        startedAt: activeAttemptRaw.startedAt,
      }
    : null;

  const freeTests = allFreeTests
    .filter((t) => t.isFree)
    .slice(0, 3);

  return {
    attemptCount,
    recentAttempts,
    activeAttempt,
    xpTotal,
    xpHasLedger,
    accuracyPct,
    freeTests,
  };
}

export interface AllAttemptsRow {
  id: string;
  testId: string;
  testTitle: string;
  category: string | null;
  isFree: boolean;
  status: "IN_PROGRESS" | "SUBMITTED";
  attemptNumber: number;
  language: string;
  startedAt: Date;
  submittedAt: Date | null;
  endsAt: Date | null;
  scorePct: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  isScored: boolean;
}

export async function getAllAttemptsForStudent(userId: string): Promise<AllAttemptsRow[]> {
  const rows = await prisma.attempt.findMany({
    where: { userId },
    orderBy: [{ startedAt: "desc" }],
    include: {
      test: {
        select: {
          title: true,
          isFree: true,
          series: { select: { categoryId: true, isFree: true } },
        },
      },
    },
  });

  return rows.map((a) => ({
    id: a.id,
    testId: a.testId,
    testTitle: a.test.title,
    category: a.test.series?.categoryId ?? null,
    isFree: a.test.series?.isFree === true || a.test.isFree,
    status: a.status as "IN_PROGRESS" | "SUBMITTED",
    attemptNumber: a.attemptNumber,
    language: a.language,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    endsAt: a.endsAt,
    scorePct: a.scorePct,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    unansweredCount: a.unansweredCount,
    isScored: a.correctCount > 0 || a.wrongCount > 0,
  }));
}

import { prisma } from "./db";

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

export interface XpBreakdown {
  total: number;
  testHub: number;
  flashcards: number;
  ebooks: number;
  pathshala: number;
}

/** Minimal type for the "Recommended Free Tests" card on the dashboard. */
export interface DashboardFreeTest {
  id: string;
  title: string;
  totalQuestions: number | null;
  durationMinutes: number | null;
  difficulty: string | null;
}

export interface DashboardData {
  attemptCount: number;
  recentAttempts: DashboardAttempt[];
  activeAttempt: ActiveAttempt | null;
  xpTotal: number;
  xpHasLedger: boolean;
  xpBreakdown: XpBreakdown;
  accuracyPct: number | null;
  freeTests: DashboardFreeTest[];
}

/**
 * Lean direct query for up to 3 free published tests.
 * Replaces the previous call to getPublishedTestsForStudent() which fetched
 * ALL published tests plus two extra entitlement/attempt queries.
 */
async function getDashboardFreeTests(): Promise<DashboardFreeTest[]> {
  try {
    return await prisma.$queryRawUnsafe<DashboardFreeTest[]>(`
      SELECT t.id, t.title, t."totalQuestions", t."durationMinutes", t.difficulty
      FROM "Test" t
      JOIN "TestSeries" ts ON ts.id = t."seriesId"
      WHERE t."isPublished" = true
        AND ts."isPublished" = true
        AND (t."isFree" = true OR ts."isFree" = true)
        AND (t."unlockAt" IS NULL OR t."unlockAt" <= NOW())
      ORDER BY t."createdAt" DESC
      LIMIT 3
    `);
  } catch {
    return [];
  }
}

// ── Per-user in-memory TTL cache ─────────────────────────────────────────────
// Repeated back-navigations to /dashboard within the TTL window are served
// from cache instead of re-running 6 parallel Neon round-trips.
const _dashCache = new Map<string, { data: DashboardData; expiresAt: number }>();
const DASH_TTL = 60_000; // 60 s

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = Date.now();
  const cached = _dashCache.get(userId);
  if (cached && now < cached.expiresAt) return cached.data;
  const result = await _fetchDashboardData(userId);
  _dashCache.set(userId, { data: result, expiresAt: now + DASH_TTL });
  return result;
}

async function _fetchDashboardData(userId: string): Promise<DashboardData> {
  const [
    attemptCount,
    recentAttemptsRaw,
    activeAttemptRaw,
    // DB-side GROUP BY so only 4–5 aggregate rows travel over the wire
    // instead of every XP ledger entry for the user.
    xpGrouped,
    // DB-side SUM so no attempt rows need to travel to compute accuracy.
    scoredAgg,
    freeTests,
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
        status: { in: ["IN_PROGRESS", "PAUSED"] },
        endsAt: { gt: new Date() },
      },
      orderBy: { startedAt: "desc" },
      include: { test: { select: { title: true } } },
    }),
    // GROUP BY refType — 1 row per XP source instead of N total rows.
    prisma.xpLedgerEntry.groupBy({
      by: ["refType"],
      where: { userId },
      _sum: { delta: true },
      _count: { _all: true },
    }),
    // Aggregate SUM — 1 row instead of all scored attempt rows.
    prisma.attempt.aggregate({
      where: { userId, status: "SUBMITTED" },
      _sum: { correctCount: true, wrongCount: true },
      _count: { _all: true },
    }),
    getDashboardFreeTests(),
  ]);

  // Build XP breakdown from the grouped aggregate rows.
  const xpBreakdown: XpBreakdown = { total: 0, testHub: 0, flashcards: 0, ebooks: 0, pathshala: 0 };
  let xpHasLedger = false;
  for (const row of xpGrouped) {
    const d = row._sum.delta ?? 0;
    xpBreakdown.total += d;
    xpHasLedger = true;
    if (row.refType === "Attempt")       xpBreakdown.testHub    += d;
    else if (row.refType === "FlashcardDeck") xpBreakdown.flashcards += d;
    else if (row.refType === "ContentPage")   xpBreakdown.ebooks     += d;
    else if (row.refType === "Video")         xpBreakdown.pathshala  += d;
  }

  // Compute accuracy from the aggregate sums — no per-row data needed.
  let accuracyPct: number | null = null;
  const totalCorrect  = scoredAgg._sum.correctCount  ?? 0;
  const totalWrong    = scoredAgg._sum.wrongCount     ?? 0;
  const totalAnswered = totalCorrect + totalWrong;
  if (totalAnswered > 0) {
    accuracyPct = Math.round((totalCorrect / totalAnswered) * 10000) / 100;
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

  return {
    attemptCount,
    recentAttempts,
    activeAttempt,
    xpTotal: xpBreakdown.total,
    xpHasLedger,
    xpBreakdown,
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

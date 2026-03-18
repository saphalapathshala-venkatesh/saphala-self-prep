import { prisma } from "./db";

// ============================================================
// ACCESS RESOLUTION
// Rule: a test is accessible when:
//   1. test.isPublished = true
//   2. series.isPublished = true (if the test belongs to a series)
//   3. AND one of:
//        a. series.isFree = true  → whole series is open
//        b. test.accessType = "FREE"  → this specific test is open
//        c. learner has a valid TESTHUB entitlement
//
// Price (pricePaise) is NOT the source of truth for access.
// ============================================================

export type AccessState = "free" | "purchased" | "locked";

/**
 * Resolve whether a user can access a given test.
 * Pass `isFree` from DbTest and `seriesId` for entitlement checks.
 */
export async function resolveTestAccess(
  test: { isFree: boolean; seriesId: string | null },
  userId: string
): Promise<AccessState> {
  if (test.isFree) return "free";

  // Check entitlement: TESTHUB_ALL grants full access;
  // TESTHUB_SERIES_<seriesId> grants access to that specific series.
  const now = new Date();
  const productCodes = ["TESTHUB_ALL"];
  if (test.seriesId) productCodes.push(`TESTHUB_SERIES_${test.seriesId}`);

  const entitlement = await prisma.userEntitlement.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      productCode: { in: productCodes },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
  });

  return entitlement ? "purchased" : "locked";
}

// ============================================================
// DB TYPES
// ============================================================

export interface DbTest {
  id: string;
  title: string;
  code: string | null;
  // Series info
  seriesId: string | null;
  series: string | null;
  seriesIsPublished: boolean | null;
  seriesIsFree: boolean | null;
  // Access
  /** Computed: seriesIsFree === true OR accessType === "FREE" */
  isFree: boolean;
  /** Raw admin-set access flag on the Test row itself */
  accessType: "FREE" | "LOCKED";
  // Display / scheduling
  category: string | null;
  durationMinutes: number;
  durationSec: number | null;
  totalQuestions: number;
  difficulty: string;
  marksPerQuestion: number;
  negativeMarks: number;
  attemptsAllowed: number;
  languageAvailable: "EN" | "TE" | "BOTH";
  instructions: string | null;
  allowPause: boolean;
  strictSectionMode: boolean;
  subjectIds: string[];
  publishedAt: Date | null;
  isPublished: boolean;
  /** ISO string when unlockAt is in the future; null otherwise */
  scheduledUntil: string | null;
}

export interface DbTestSection {
  id: string;
  title: string;
  sortOrder: number;
  durationSec: number | null;
  questionCount: number;
  subsections: {
    id: string;
    title: string;
    sortOrder: number;
    durationSec: number | null;
    questionCount: number;
  }[];
}

export interface DbQuestion {
  id: string;
  order: number;
  sectionId: string | null;
  subjectId: string | null;
  subjectName: string | null;
  topicId: string | null;
  topicName: string | null;
  subtopicId: string | null;
  subtopicName: string | null;
  correctOptionOrder: number;
  questionText_en: string | null;
  questionText_te: string | null;
  explanation_en: string | null;
  explanation_te: string | null;
  options: {
    id: string;
    order: number;
    textEn: string | null;
    textTe: string | null;
    isCorrect: boolean;
  }[];
}

// ============================================================
// HELPERS
// ============================================================

function difficultyLabel(d: string): string {
  if (d === "FOUNDATIONAL") return "Easy";
  if (d === "PROFICIENT") return "Medium";
  return "Hard";
}

function deriveDifficulty(questionDifficulties: string[]): string {
  if (questionDifficulties.length === 0) return "Medium";
  const counts: Record<string, number> = {};
  for (const d of questionDifficulties) {
    counts[d] = (counts[d] || 0) + 1;
  }
  let maxKey = questionDifficulties[0];
  let maxCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }
  return difficultyLabel(maxKey);
}

function mapToDbTest(
  test: {
    id: string;
    title: string;
    code: string | null;
    seriesId: string | null;
    instructions: string | null;
    durationSec: number | null;
    isFree: boolean;
    allowPause: boolean;
    strictSectionMode: boolean;
    marksPerQuestion: number | null;
    negativeMarksPerQuestion: number | null;
    attemptsAllowed: number;
    languageAvailable: string;
    subjectIds: string[];
    publishedAt: Date | null;
    isPublished: boolean;
    unlockAt: Date | null;
    series?: {
      title: string;
      categoryId: string | null;
      isPublished: boolean;
      isFree: boolean;
    } | null;
    questions: { marks: number; negativeMarks: number; question: { difficulty: string } }[];
  },
  categoryName: string | null
): DbTest {
  const qDiffs = test.questions.map((tq) => tq.question.difficulty);
  const isFreeByTest = test.isFree;
  const isFreeByS = test.series?.isFree === true;

  // Derive marks from per-question data (admin source of truth) when test-level
  // fields are not set. Admin sets TestQuestion.marks / TestQuestion.negativeMarks;
  // Test.marksPerQuestion / Test.negativeMarksPerQuestion are student-side fields
  // that may remain 0 when admin hasn't synced them.
  const firstTq = test.questions[0];
  const effectiveMarksPerQ =
    (test.marksPerQuestion ?? 0) > 0
      ? test.marksPerQuestion!
      : (firstTq?.marks ?? 1);
  const effectiveNegMarks =
    (test.negativeMarksPerQuestion ?? 0) > 0
      ? test.negativeMarksPerQuestion!
      : (firstTq?.negativeMarks ?? 0);

  return {
    id: test.id,
    title: test.title,
    code: test.code,
    seriesId: test.seriesId,
    series: test.series?.title || null,
    seriesIsPublished: test.series?.isPublished ?? null,
    seriesIsFree: test.series?.isFree ?? null,
    isFree: isFreeByS || isFreeByTest,
    accessType: (isFreeByS || isFreeByTest) ? "FREE" : "LOCKED",
    category: categoryName,
    durationMinutes: test.durationSec ? Math.round(test.durationSec / 60) : 0,
    durationSec: test.durationSec,
    totalQuestions: test.questions.length,
    difficulty: deriveDifficulty(qDiffs),
    marksPerQuestion: effectiveMarksPerQ,
    negativeMarks: effectiveNegMarks,
    attemptsAllowed: test.attemptsAllowed,
    languageAvailable: test.languageAvailable as "EN" | "TE" | "BOTH",
    instructions: test.instructions,
    allowPause: test.allowPause,
    strictSectionMode: test.strictSectionMode,
    subjectIds: test.subjectIds,
    publishedAt: test.publishedAt,
    isPublished: test.isPublished,
    scheduledUntil:
      test.unlockAt && test.unlockAt > new Date()
        ? test.unlockAt.toISOString()
        : null,
  };
}

// ============================================================
// QUERIES — single test
// ============================================================

const SERIES_SELECT = {
  title: true,
  categoryId: true,
  isPublished: true,
  isFree: true,
} as const;

const QUESTIONS_INCLUDE = {
  select: {
    marks: true,
    negativeMarks: true,
    question: { select: { difficulty: true } },
  },
} as const;

export async function getDbTestById(testId: string): Promise<DbTest | null> {
  const test = await prisma.test.findUnique({
    where: { id: testId, isPublished: true },
    include: {
      series: { select: SERIES_SELECT },
      questions: QUESTIONS_INCLUDE,
    },
  });
  if (!test) return null;

  const rawCategoryId = test.series?.categoryId ?? null;
  let categoryName: string | null = null;
  if (rawCategoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: rawCategoryId },
      select: { name: true },
    });
    categoryName = cat?.name ?? null;
  }

  return mapToDbTest(test, categoryName);
}

export async function getDbTestByCode(code: string): Promise<DbTest | null> {
  const test = await prisma.test.findUnique({
    where: { code, isPublished: true },
    include: {
      series: { select: SERIES_SELECT },
      questions: QUESTIONS_INCLUDE,
    },
  });
  if (!test) return null;

  const rawCatId = test.series?.categoryId ?? null;
  let catName: string | null = null;
  if (rawCatId) {
    const cat = await prisma.category.findUnique({
      where: { id: rawCatId },
      select: { name: true },
    });
    catName = cat?.name ?? null;
  }

  return mapToDbTest(test, catName);
}

// ============================================================
// QUERIES — questions for attempt
// ============================================================

export async function getDbQuestionsForTest(testId: string): Promise<DbQuestion[]> {
  const testQuestions = await prisma.testQuestion.findMany({
    where: { testId },
    orderBy: { order: "asc" },
    include: {
      question: {
        include: {
          options: { orderBy: { order: "asc" } },
          subtopic: {
            include: {
              topic: {
                include: { subject: true },
              },
            },
          },
        },
      },
    },
  });

  // Batch-fetch subjects/topics for questions that have denormalised IDs
  // but no subtopic relation (legacy data or questions without subtopics assigned)
  const orphanSubjectIds = Array.from(
    new Set(
      testQuestions
        .filter((tq) => !tq.question.subtopic && tq.question.subjectId)
        .map((tq) => tq.question.subjectId as string)
    )
  );
  const orphanTopicIds = Array.from(
    new Set(
      testQuestions
        .filter((tq) => !tq.question.subtopic && tq.question.topicId)
        .map((tq) => tq.question.topicId as string)
    )
  );

  const [orphanSubjects, orphanTopics] = await Promise.all([
    orphanSubjectIds.length > 0
      ? prisma.subject.findMany({ where: { id: { in: orphanSubjectIds } }, select: { id: true, name: true } })
      : [],
    orphanTopicIds.length > 0
      ? prisma.topic.findMany({ where: { id: { in: orphanTopicIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const orphanSubjectMap = new Map(orphanSubjects.map((s) => [s.id, s.name]));
  const orphanTopicMap = new Map(orphanTopics.map((t) => [t.id, t.name]));

  return testQuestions.map((tq) => {
    const q = tq.question;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);

    // Resolve taxonomy: prefer the Prisma relation chain (most accurate),
    // fall back to denormalized IDs on the Question row.
    let subjectId: string | null = null;
    let subjectName: string | null = null;
    let topicId: string | null = null;
    let topicName: string | null = null;
    let subtopicId: string | null = null;
    let subtopicName: string | null = null;

    if (q.subtopic) {
      subtopicId = q.subtopic.id;
      subtopicName = q.subtopic.name;
      if (q.subtopic.topic) {
        topicId = q.subtopic.topic.id;
        topicName = q.subtopic.topic.name;
        if (q.subtopic.topic.subject) {
          subjectId = q.subtopic.topic.subject.id;
          subjectName = q.subtopic.topic.subject.name;
        }
      }
    }

    // Fill in from denormalized fields when relation chain didn't cover them
    if (!subjectId && q.subjectId) {
      subjectId = q.subjectId;
      subjectName = orphanSubjectMap.get(q.subjectId) ?? null;
    }
    if (!topicId && q.topicId) {
      topicId = q.topicId;
      topicName = orphanTopicMap.get(q.topicId) ?? null;
    }

    return {
      id: q.id,
      order: tq.order,
      sectionId: tq.sectionId ?? null,
      subjectId,
      subjectName,
      topicId,
      topicName,
      subtopicId,
      subtopicName,
      correctOptionOrder: correctIdx >= 0 ? correctIdx : 0,
      questionText_en: q.stem,
      questionText_te: q.stemSecondary ?? q.stem,
      explanation_en: q.explanation ?? null,
      explanation_te: q.explanationSecondary ?? q.explanation ?? null,
      options: q.options.map((o) => ({
        id: o.id,
        order: o.order,
        textEn: o.text,
        textTe: o.textSecondary ?? o.text,
        isCorrect: o.isCorrect,
      })),
    };
  });
}

// ============================================================
// QUERIES — sections for a test
// ============================================================

export async function getTestSectionsForAttempt(testId: string): Promise<DbTestSection[]> {
  const sections = await prisma.testSection.findMany({
    where: { testId, parentSectionId: null },
    orderBy: { order: "asc" },
    include: {
      subsections: {
        orderBy: { order: "asc" },
        include: {
          questions: { select: { id: true } },
        },
      },
      questions: { select: { id: true } },
    },
  });

  return sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    sortOrder: sec.order,
    durationSec: sec.durationSec ?? null,
    questionCount: sec.questions.length,
    subsections: sec.subsections.map((sub) => ({
      id: sub.id,
      title: sub.title,
      sortOrder: sub.order,
      durationSec: sub.durationSec ?? null,
      questionCount: sub.questions.length,
    })),
  }));
}

// ============================================================
// QUERIES — published test listing
// ============================================================

export interface StudentTestItem {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  series: string | null;
  seriesId: string | null;
  durationMinutes: number;
  totalQuestions: number;
  difficulty: string;
  /** Computed free flag: series.isFree OR test.accessType === "FREE" */
  isFree: boolean;
  /** User-specific resolved state (requires userId to get "purchased") */
  accessState: AccessState;
  /** Raw admin-set flag on the test row */
  accessType: "FREE" | "LOCKED";
  languageAvailable: "EN" | "TE" | "BOTH";
  attemptsAllowed: number;
  completedAttempts: number;
  hasActiveAttempt: boolean;
  attemptsExhausted: boolean;
  /** ISO string when unlockAt is in the future; null otherwise */
  scheduledUntil: string | null;
}

export async function getAllPublishedTests(): Promise<DbTest[]> {
  const tests = await prisma.test.findMany({
    where: {
      isPublished: true,
      OR: [
        { seriesId: null },
        { series: { isPublished: true } },
      ],
    },
    include: {
      series: { select: SERIES_SELECT },
      questions: QUESTIONS_INCLUDE,
    },
    orderBy: { createdAt: "asc" },
  });

  // Batch-resolve category names
  const rawCategoryIds = Array.from(
    new Set(tests.map((t) => t.series?.categoryId).filter((id): id is string => !!id))
  );
  const categoryRows = rawCategoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: rawCategoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));

  return tests.map((test) => {
    const rawCatId = test.series?.categoryId ?? null;
    return mapToDbTest(test, rawCatId ? (categoryMap.get(rawCatId) ?? null) : null);
  });
}

export async function getPublishedTestsForStudent(userId?: string): Promise<StudentTestItem[]> {
  const all = await getAllPublishedTests();

  // Build attempt state maps if user is logged in
  const completedMap = new Map<string, number>();
  const activeSet = new Set<string>();

  // Build entitlement maps if user is logged in
  let userHasFullAccess = false;
  const userSeriesAccess = new Set<string>();

  if (userId) {
    const now = new Date();

    const [userAttempts, entitlements] = await Promise.all([
      prisma.attempt.findMany({
        where: { userId, testId: { in: all.map((t) => t.id) } },
        select: { testId: true, status: true, endsAt: true },
      }),
      prisma.userEntitlement.findMany({
        where: {
          userId,
          status: "ACTIVE",
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        select: { productCode: true },
      }),
    ]);

    for (const a of userAttempts) {
      if (a.status === "SUBMITTED") {
        completedMap.set(a.testId, (completedMap.get(a.testId) ?? 0) + 1);
      } else if ((a.status === "IN_PROGRESS" || a.status === "PAUSED") && (!a.endsAt || a.endsAt > now)) {
        activeSet.add(a.testId);
      }
    }

    userHasFullAccess = entitlements.some((e) => e.productCode === "TESTHUB_ALL");
    for (const e of entitlements) {
      if (e.productCode.startsWith("TESTHUB_SERIES_")) {
        userSeriesAccess.add(e.productCode.slice("TESTHUB_SERIES_".length));
      }
    }
  }

  return all.map((t) => {
    const completed = completedMap.get(t.id) ?? 0;
    const hasActive = activeSet.has(t.id);

    let accessState: AccessState;
    if (t.isFree) {
      accessState = "free";
    } else if (userId && (userHasFullAccess || (t.seriesId && userSeriesAccess.has(t.seriesId)))) {
      accessState = "purchased";
    } else {
      accessState = "locked";
    }

    return {
      id: t.id,
      title: t.title,
      code: t.code,
      category: t.category,
      series: t.series,
      seriesId: t.seriesId,
      durationMinutes: t.durationMinutes,
      totalQuestions: t.totalQuestions,
      difficulty: t.difficulty,
      isFree: t.isFree,
      accessState,
      accessType: t.accessType,
      languageAvailable: t.languageAvailable,
      attemptsAllowed: t.attemptsAllowed,
      completedAttempts: completed,
      hasActiveAttempt: hasActive,
      attemptsExhausted: !hasActive && completed >= t.attemptsAllowed,
      scheduledUntil: t.scheduledUntil,
    };
  });
}

// ============================================================
// ATTEMPT OPERATIONS
// ============================================================

export async function getAttemptsForUserTest(userId: string, testId: string) {
  return prisma.attempt.findMany({
    where: { userId, testId },
    orderBy: { startedAt: "asc" },
  });
}

export async function getActiveAttempt(userId: string, testId: string) {
  return prisma.attempt.findFirst({
    where: { userId, testId, status: { in: ["IN_PROGRESS", "PAUSED"] } },
  });
}

export async function createAttempt(
  userId: string,
  testId: string,
  language: "EN" | "TE",
  durationMinutes: number
) {
  const existing = await getAttemptsForUserTest(userId, testId);
  const attemptNumber = existing.length + 1;
  const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  return prisma.attempt.create({
    data: {
      userId,
      testId,
      status: "IN_PROGRESS",
      attemptNumber,
      language,
      endsAt,
    },
  });
}

export async function getAttemptById(attemptId: string) {
  return prisma.attempt.findUnique({ where: { id: attemptId } });
}

// ============================================================
// PAUSE / RESUME OPERATIONS
// ============================================================

/**
 * Fetch all pause events for an attempt, ordered by pausedAt asc.
 */
export async function getPauseEvents(attemptId: string) {
  return prisma.attemptPause.findMany({
    where: { attemptId },
    orderBy: { pausedAt: "asc" },
  });
}

/**
 * Find the open (not yet resumed) pause event, if any.
 */
export async function getOpenPauseEvent(attemptId: string) {
  return prisma.attemptPause.findFirst({
    where: { attemptId, resumedAt: null },
    orderBy: { pausedAt: "desc" },
  });
}

/**
 * Compute total paused milliseconds from a list of pause events.
 * Only counts CLOSED events (resumedAt != null).
 * The caller can optionally pass `nowMs` to include an open event's running time.
 */
export function computeTotalPausedMs(
  events: { pausedAt: Date; resumedAt: Date | null }[],
  includeOpenEventUpTo?: Date
): number {
  let total = 0;
  for (const ev of events) {
    if (ev.resumedAt) {
      total += ev.resumedAt.getTime() - ev.pausedAt.getTime();
    } else if (includeOpenEventUpTo) {
      total += includeOpenEventUpTo.getTime() - ev.pausedAt.getTime();
    }
  }
  return total;
}

/**
 * Pause an attempt:
 * 1. Verify no open pause event already exists (idempotency guard)
 * 2. Create AttemptPause row with pausedAt = now
 * 3. Set Attempt.status = PAUSED
 * All in one transaction.
 *
 * Returns the created pause event.
 * Throws if attempt is already paused.
 */
export async function pauseAttempt(attemptId: string) {
  return prisma.$transaction(async (tx) => {
    // Guard: reject if already paused (open event exists)
    const existing = await tx.attemptPause.findFirst({
      where: { attemptId, resumedAt: null },
    });
    if (existing) {
      throw new Error("ALREADY_PAUSED");
    }

    const pausedAt = new Date();

    const [event] = await Promise.all([
      tx.attemptPause.create({
        data: { attemptId, pausedAt },
      }),
      tx.attempt.update({
        where: { id: attemptId },
        data: { status: "PAUSED" },
      }),
    ]);

    return { event, pausedAt };
  });
}

/**
 * Resume an attempt:
 * 1. Find the open pause event
 * 2. Set resumedAt = now on that event
 * 3. Extend attempt.endsAt by the paused duration so the countdown stays accurate
 * 4. Set Attempt.status = IN_PROGRESS
 * All in one transaction.
 *
 * Returns the updated attempt with new endsAt.
 * Throws if no open pause event.
 */
export async function resumeAttempt(attemptId: string) {
  return prisma.$transaction(async (tx) => {
    const openEvent = await tx.attemptPause.findFirst({
      where: { attemptId, resumedAt: null },
      orderBy: { pausedAt: "desc" },
    });
    if (!openEvent) {
      throw new Error("NOT_PAUSED");
    }

    const resumedAt = new Date();
    const pauseDurationMs = resumedAt.getTime() - openEvent.pausedAt.getTime();

    // Extend endsAt so the remaining time is preserved
    const current = await tx.attempt.findUnique({
      where: { id: attemptId },
      select: { endsAt: true },
    });
    const newEndsAt = current?.endsAt
      ? new Date(current.endsAt.getTime() + pauseDurationMs)
      : null;

    const [, updated] = await Promise.all([
      tx.attemptPause.update({
        where: { id: openEvent.id },
        data: { resumedAt },
      }),
      tx.attempt.update({
        where: { id: attemptId },
        data: {
          status: "IN_PROGRESS",
          ...(newEndsAt ? { endsAt: newEndsAt } : {}),
        },
      }),
    ]);

    return { attempt: updated, pauseDurationMs, resumedAt };
  });
}

export async function submitAttempt(attemptId: string) {
  return prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      lockedSessionToken: null,
    },
  });
}

export async function lockAttemptSession(attemptId: string, sessionToken: string): Promise<void> {
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { lockedSessionToken: sessionToken },
  });
}

export async function upsertAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string | null,
  isMarkedForReview: boolean,
  timeSpentMsDelta: number
) {
  const existing = await prisma.attemptAnswer.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
  });

  if (existing) {
    return prisma.attemptAnswer.update({
      where: { id: existing.id },
      data: {
        selectedOptionId,
        isMarkedForReview,
        timeSpentMs: existing.timeSpentMs + timeSpentMsDelta,
        savedAt: new Date(),
      },
    });
  }

  return prisma.attemptAnswer.create({
    data: {
      attemptId,
      questionId,
      selectedOptionId,
      isMarkedForReview,
      timeSpentMs: timeSpentMsDelta,
      savedAt: new Date(),
    },
  });
}

export async function getAnswersForAttempt(attemptId: string) {
  return prisma.attemptAnswer.findMany({
    where: { attemptId },
  });
}

export async function bulkUpsertAnswers(
  attemptId: string,
  finalAnswers: Array<{
    questionId: string;
    selectedOptionId: string | null;
    isMarkedForReview: boolean;
    timeSpentMs: number;
  }>
) {
  for (const fa of finalAnswers) {
    const existing = await prisma.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId: fa.questionId } },
    });

    if (existing) {
      await prisma.attemptAnswer.update({
        where: { id: existing.id },
        data: {
          selectedOptionId: fa.selectedOptionId,
          isMarkedForReview: fa.isMarkedForReview,
          timeSpentMs: fa.timeSpentMs,
          savedAt: new Date(),
        },
      });
    } else {
      await prisma.attemptAnswer.create({
        data: {
          attemptId,
          questionId: fa.questionId,
          selectedOptionId: fa.selectedOptionId,
          isMarkedForReview: fa.isMarkedForReview,
          timeSpentMs: fa.timeSpentMs,
          savedAt: new Date(),
        },
      });
    }
  }
}

export async function getAllSubmittedAnswersForQuestion(questionId: string) {
  return prisma.attemptAnswer.findMany({
    where: {
      questionId,
      attempt: { status: "SUBMITTED" },
    },
  });
}

export async function getFirstAttemptsForTest(testId: string) {
  return prisma.attempt.findMany({
    where: { testId, status: "SUBMITTED", attemptNumber: 1 },
    select: {
      id: true,
      userId: true,
      testId: true,
      startedAt: true,
      submittedAt: true,
      scorePct: true,
      correctCount: true,
      wrongCount: true,
      unansweredCount: true,
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function getFirstAttemptAnswersForQuestions(questionIds: string[], testId: string) {
  if (questionIds.length === 0) return [];
  return prisma.attemptAnswer.findMany({
    where: {
      questionId: { in: questionIds },
      selectedOptionId: { not: null },
      attempt: { testId, status: "SUBMITTED", attemptNumber: 1 },
    },
    select: { questionId: true, timeSpentMs: true },
  });
}

export async function resolveOptionIdFromLetter(
  questionId: string,
  letter: string
): Promise<string | null> {
  const idx = ["A", "B", "C", "D"].indexOf(letter.toUpperCase());
  if (idx < 0) return null;

  const options = await prisma.questionOption.findMany({
    where: { questionId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  return options[idx]?.id ?? null;
}

export function optionIdToLetter(
  optionId: string,
  orderedOptions: { id: string }[]
): string | null {
  const idx = orderedOptions.findIndex((o) => o.id === optionId);
  if (idx < 0) return null;
  return ["A", "B", "C", "D"][idx] || null;
}

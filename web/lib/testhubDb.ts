import { prisma } from "./db";

export interface DbTest {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  series: string | null;
  durationMinutes: number;
  totalQuestions: number;
  difficulty: string;
  accessType: "FREE" | "LOCKED";
  marksPerQuestion: number;
  negativeMarks: number;
  attemptsAllowed: number;
  languageAvailable: "EN" | "TE" | "BOTH";
  instructions: string | null;
  subjectIds: string[];
  publishedAt: Date | null;
  isPublished: boolean;
}

export interface DbQuestion {
  id: string;
  order: number;
  subjectId: string | null;
  subjectName: string | null;
  correctOptionOrder: number;
  questionText_en: string | null;
  questionText_te: string | null;
  options: {
    id: string;
    order: number;
    textEn: string | null;
    textTe: string | null;
    isCorrect: boolean;
  }[];
}

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

function optionLetter(order: number): string {
  return ["A", "B", "C", "D"][order] || "A";
}

export async function getDbTestById(testId: string): Promise<DbTest | null> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      series: { select: { title: true, categoryId: true } },
      questions: {
        include: { question: { select: { difficulty: true } } },
      },
    },
  });

  if (!test) return null;

  const qDiffs = test.questions.map((tq) => tq.question.difficulty);
  const testDifficulty = deriveDifficulty(qDiffs);

  return {
    id: test.id,
    title: test.title,
    code: test.code,
    category: test.series?.categoryId || "NEET",
    series: test.series?.title || null,
    durationMinutes: test.durationSec ? Math.round(test.durationSec / 60) : 0,
    totalQuestions: test.questions.length,
    difficulty: testDifficulty,
    accessType: test.accessType,
    marksPerQuestion: test.marksPerQuestion,
    negativeMarks: test.negativeMarksPerQuestion,
    attemptsAllowed: test.attemptsAllowed,
    languageAvailable: test.languageAvailable,
    instructions: test.instructions,
    subjectIds: test.subjectIds,
    publishedAt: test.publishedAt,
    isPublished: test.isPublished,
  };
}

export async function getDbTestByCode(code: string): Promise<DbTest | null> {
  const test = await prisma.test.findUnique({
    where: { code },
    include: {
      series: { select: { title: true, categoryId: true } },
      questions: {
        include: { question: { select: { difficulty: true } } },
      },
    },
  });

  if (!test) return null;

  const qDiffs = test.questions.map((tq) => tq.question.difficulty);
  const testDifficulty = deriveDifficulty(qDiffs);

  return {
    id: test.id,
    title: test.title,
    code: test.code,
    category: test.series?.categoryId || "NEET",
    series: test.series?.title || null,
    durationMinutes: test.durationSec ? Math.round(test.durationSec / 60) : 0,
    totalQuestions: test.questions.length,
    difficulty: testDifficulty,
    accessType: test.accessType,
    marksPerQuestion: test.marksPerQuestion,
    negativeMarks: test.negativeMarksPerQuestion,
    attemptsAllowed: test.attemptsAllowed,
    languageAvailable: test.languageAvailable,
    instructions: test.instructions,
    subjectIds: test.subjectIds,
    publishedAt: test.publishedAt,
    isPublished: test.isPublished,
  };
}

export async function getDbQuestionsForTest(testId: string): Promise<DbQuestion[]> {
  const testQuestions = await prisma.testQuestion.findMany({
    where: { testId },
    orderBy: { order: "asc" },
    include: {
      question: {
        include: {
          options: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  return testQuestions.map((tq) => {
    const q = tq.question;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);

    return {
      id: q.id,
      order: tq.order,
      subjectId: q.subjectId,
      subjectName: q.subjectId ? q.subjectId.charAt(0).toUpperCase() + q.subjectId.slice(1) : null,
      correctOptionOrder: correctIdx >= 0 ? correctIdx : 0,
      questionText_en: q.stemEn,
      questionText_te: q.stemTe,
      options: q.options.map((o) => ({
        id: o.id,
        order: o.order,
        textEn: o.textEn,
        textTe: o.textTe,
        isCorrect: o.isCorrect,
      })),
    };
  });
}

export interface StudentTestItem {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  series: string | null;
  durationMinutes: number;
  totalQuestions: number;
  difficulty: string;
  accessType: "FREE" | "LOCKED";
  languageAvailable: "EN" | "TE" | "BOTH";
}

export async function getPublishedTestsForStudent(): Promise<StudentTestItem[]> {
  const all = await getAllPublishedTests();
  return all.map((t) => ({
    id: t.id,
    title: t.title,
    code: t.code,
    category: t.category,
    series: t.series,
    durationMinutes: t.durationMinutes,
    totalQuestions: t.totalQuestions,
    difficulty: t.difficulty,
    accessType: t.accessType,
    languageAvailable: t.languageAvailable,
  }));
}

export async function getAllPublishedTests(): Promise<DbTest[]> {
  const tests = await prisma.test.findMany({
    where: { isPublished: true },
    include: {
      series: { select: { title: true, categoryId: true } },
      questions: {
        include: { question: { select: { difficulty: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return tests.map((test) => {
    const qDiffs = test.questions.map((tq) => tq.question.difficulty);
    const testDifficulty = deriveDifficulty(qDiffs);

    return {
      id: test.id,
      title: test.title,
      code: test.code,
      category: test.series?.categoryId || "NEET",
      series: test.series?.title || null,
      durationMinutes: test.durationSec ? Math.round(test.durationSec / 60) : 0,
      totalQuestions: test.questions.length,
      difficulty: testDifficulty,
      accessType: test.accessType,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarks: test.negativeMarksPerQuestion,
      attemptsAllowed: test.attemptsAllowed,
      languageAvailable: test.languageAvailable,
      instructions: test.instructions,
      subjectIds: test.subjectIds,
      publishedAt: test.publishedAt,
      isPublished: test.isPublished,
    };
  });
}

export async function getAttemptsForUserTest(userId: string, testId: string) {
  return prisma.attempt.findMany({
    where: { userId, testId },
    orderBy: { startedAt: "asc" },
  });
}

export async function getActiveAttempt(userId: string, testId: string) {
  return prisma.attempt.findFirst({
    where: { userId, testId, status: "IN_PROGRESS" },
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

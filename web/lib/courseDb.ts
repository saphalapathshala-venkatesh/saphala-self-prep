import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
  FREE_DEMO: "Free Demo",
  COMPLETE_PREP_PACK: "Complete Prep Pack",
  VIDEO_ONLY: "Video Course",
  SELF_PREP: "Self Prep",
  PDF_ONLY: "PDF Notes",
  TEST_SERIES: "Test Series",
  FLASHCARDS_ONLY: "Flashcard Decks",
  CURRENT_AFFAIRS: "Current Affairs",
  STANDARD: "Standard",
  PACKAGE: "Package",
};

export interface ExamItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

export interface CourseListItem {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  examId: string | null;
  examName: string | null;
  productCategory: string;
  productCategoryLabel: string;
  featured: boolean;
  hasVideoCourse: boolean;
  hasHtmlCourse: boolean;
  hasPdfCourse: boolean;
  hasTestSeries: boolean;
  hasFlashcardDecks: boolean;
}

export interface LessonItemRow {
  itemId: string;
  itemType: string;
  sourceId: string | null;
  titleSnapshot: string;
  sortOrder: number;
  unlockAt: Date | null;
  externalUrl: string | null;
}

export interface LessonRow {
  lessonId: string;
  title: string;
  sortOrder: number;
  items: LessonItemRow[];
}

export interface ChapterRow {
  chapterId: string;
  title: string;
  sortOrder: number;
  lessons: LessonRow[];
}

export interface SectionRow {
  sectionId: string;
  subjectId: string | null;
  subjectName: string;
  label: string | null;
  sortOrder: number;
  chapters: ChapterRow[];
}

const SUBJECT_PALETTE: Array<{ bg: string; icon: string; border: string }> = [
  { bg: "#EDE9FE", icon: "#6D4BCB", border: "#C4B5FD" },
  { bg: "#DBEAFE", icon: "#2563EB", border: "#93C5FD" },
  { bg: "#D1FAE5", icon: "#059669", border: "#6EE7B7" },
  { bg: "#FEF3C7", icon: "#D97706", border: "#FCD34D" },
  { bg: "#FCE7F3", icon: "#DB2777", border: "#F9A8D4" },
  { bg: "#FFEDD5", icon: "#EA580C", border: "#FED7AA" },
  { bg: "#E0F2FE", icon: "#0284C7", border: "#7DD3FC" },
  { bg: "#F0FDF4", icon: "#16A34A", border: "#86EFAC" },
  { bg: "#FFF7ED", icon: "#C2410C", border: "#FDBA74" },
  { bg: "#F5F3FF", icon: "#7C3AED", border: "#DDD6FE" },
  { bg: "#FEF9C3", icon: "#CA8A04", border: "#FDE047" },
  { bg: "#ECFDF5", icon: "#0F766E", border: "#99F6E4" },
];

export function subjectColor(id: string | null): { bg: string; icon: string; border: string } {
  if (!id) return SUBJECT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}

export interface CourseDetail extends CourseListItem {
  curriculum: SectionRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function itemUrl(item: LessonItemRow): string | null {
  switch (item.itemType) {
    case "HTML_PAGE":
      return item.sourceId ? `/learn/lessons/${item.sourceId}` : null;
    case "FLASHCARD_DECK":
      return item.sourceId ? `/learn/flashcards/${item.sourceId}` : null;
    case "PDF":
      return item.sourceId ? `/learn/pdfs` : null;
    case "EXTERNAL_LINK":
      return item.externalUrl ?? null;
    default:
      return null;
  }
}

export function itemIcon(itemType: string): string {
  switch (itemType) {
    case "HTML_PAGE": return "📖";
    case "PDF": return "📄";
    case "FLASHCARD_DECK": return "🃏";
    case "VIDEO": return "🎬";
    case "EXTERNAL_LINK": return "🔗";
    default: return "📌";
  }
}

// ── Raw SQL query types ───────────────────────────────────────────────────────

type RawCourse = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  examId: string | null;
  examName: string | null;
  productCategory: string;
  featured: boolean;
  hasVideoCourse: boolean;
  hasHtmlCourse: boolean;
  hasPdfCourse: boolean;
  hasTestSeries: boolean;
  hasFlashcardDecks: boolean;
};

function mapCourse(r: RawCourse): CourseListItem {
  return {
    ...r,
    productCategoryLabel: PRODUCT_CATEGORY_LABEL[r.productCategory] ?? r.productCategory,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return all exams belonging to a given category.
 * Exam is admin-owned → raw SQL.
 */
export async function getExamsForCategory(categoryId: string): Promise<ExamItem[]> {
  const safeId = categoryId.replace(/'/g, "''");
  const rows = await prisma.$queryRawUnsafe<ExamItem[]>(`
    SELECT id, name, slug, "categoryId"
    FROM "Exam"
    WHERE "categoryId" = '${safeId}'
    ORDER BY name ASC
  `);
  return rows;
}

/**
 * Fetch active courses with optional filters.
 * Course is admin-owned → queried via raw SQL.
 */
export async function getActiveCourses(opts?: {
  categoryId?: string;
  examId?: string;
  productCategory?: string;
  featured?: boolean;
  limit?: number;
}): Promise<CourseListItem[]> {
  const conditions: string[] = [`c."isActive" = true`];
  if (opts?.categoryId)      conditions.push(`c."categoryId"      = '${opts.categoryId.replace(/'/g, "''")}'`);
  if (opts?.examId)          conditions.push(`c."examId"          = '${opts.examId.replace(/'/g, "''")}'`);
  if (opts?.productCategory) conditions.push(`c."productCategory" = '${opts.productCategory.replace(/'/g, "''")}'`);
  if (opts?.featured === true) conditions.push(`c.featured = true`);

  const where = conditions.join(" AND ");
  const limitClause = opts?.limit ? `LIMIT ${opts.limit}` : "LIMIT 50";

  const rows = await prisma.$queryRawUnsafe<RawCourse[]>(`
    SELECT
      c.id,
      c.name,
      c.description,
      c."thumbnailUrl",
      c."categoryId",
      cat.name AS "categoryName",
      c."examId",
      e.name   AS "examName",
      c."productCategory",
      c.featured,
      c."hasVideoCourse",
      c."hasHtmlCourse",
      c."hasPdfCourse",
      c."hasTestSeries",
      c."hasFlashcardDecks"
    FROM "Course" c
    LEFT JOIN "Category" cat ON cat.id = c."categoryId"
    LEFT JOIN "Exam"     e   ON e.id   = c."examId"
    WHERE ${where}
    ORDER BY c.featured DESC, c."createdAt" DESC
    ${limitClause}
  `);

  return rows.map(mapCourse);
}

/**
 * Fetch a single course with its full curriculum tree.
 * Only PUBLISHED lessons are included.
 */
export async function getCourseWithCurriculum(courseId: string): Promise<CourseDetail | null> {
  const safeId = courseId.replace(/'/g, "''");

  const courses = await prisma.$queryRawUnsafe<RawCourse[]>(`
    SELECT
      c.id,
      c.name,
      c.description,
      c."thumbnailUrl",
      c."categoryId",
      cat.name AS "categoryName",
      c."examId",
      e.name   AS "examName",
      c."productCategory",
      c.featured,
      c."hasVideoCourse",
      c."hasHtmlCourse",
      c."hasPdfCourse",
      c."hasTestSeries",
      c."hasFlashcardDecks"
    FROM "Course" c
    LEFT JOIN "Category" cat ON cat.id = c."categoryId"
    LEFT JOIN "Exam"     e   ON e.id   = c."examId"
    WHERE c.id = '${safeId}' AND c."isActive" = true
    LIMIT 1
  `);
  if (!courses.length) return null;
  const course = mapCourse(courses[0]);

  type RawSection = { sectionId: string; subjectId: string | null; subjectName: string; label: string | null; sortOrder: number };
  const rawSections = await prisma.$queryRawUnsafe<RawSection[]>(`
    SELECT
      css.id AS "sectionId",
      css."subjectId",
      COALESCE(css.label, s.name, 'Section') AS "subjectName",
      css.label,
      css."sortOrder"
    FROM "CourseSubjectSection" css
    LEFT JOIN "Subject" s ON s.id = css."subjectId"
    WHERE css."courseId" = '${safeId}'
    ORDER BY css."sortOrder" ASC
  `);
  if (!rawSections.length) {
    return { ...course, curriculum: [] };
  }

  const sectionIds = rawSections.map((s) => `'${s.sectionId}'`).join(",");

  type RawChapter = { chapterId: string; sectionId: string; title: string; sortOrder: number };
  const rawChapters = await prisma.$queryRawUnsafe<RawChapter[]>(`
    SELECT id AS "chapterId", "sectionId", title, "sortOrder"
    FROM "Chapter"
    WHERE "sectionId" IN (${sectionIds})
    ORDER BY "sortOrder" ASC
  `);

  if (!rawChapters.length) {
    return {
      ...course,
      curriculum: rawSections.map((s) => ({ ...s, chapters: [] })),
    };
  }

  const chapterIds = rawChapters.map((c) => `'${c.chapterId}'`).join(",");

  type RawLesson = { lessonId: string; chapterId: string; title: string; sortOrder: number };
  const rawLessons = await prisma.$queryRawUnsafe<RawLesson[]>(`
    SELECT id AS "lessonId", "chapterId", title, "sortOrder"
    FROM "Lesson"
    WHERE "chapterId" IN (${chapterIds}) AND status = 'PUBLISHED'
    ORDER BY "sortOrder" ASC
  `);

  if (!rawLessons.length) {
    const chapterMap = new Map<string, ChapterRow>();
    rawChapters.forEach((c) => chapterMap.set(c.chapterId, { ...c, lessons: [] }));
    return {
      ...course,
      curriculum: rawSections.map((s) => ({
        ...s,
        chapters: rawChapters
          .filter((c) => c.sectionId === s.sectionId)
          .map((c) => chapterMap.get(c.chapterId)!),
      })),
    };
  }

  const lessonIds = rawLessons.map((l) => `'${l.lessonId}'`).join(",");

  type RawItem = {
    itemId: string;
    lessonId: string;
    itemType: string;
    sourceId: string | null;
    titleSnapshot: string;
    sortOrder: number;
    unlockAt: Date | null;
    externalUrl: string | null;
  };
  const rawItems = await prisma.$queryRawUnsafe<RawItem[]>(`
    SELECT
      id AS "itemId",
      "lessonId",
      "itemType",
      "sourceId",
      "titleSnapshot",
      "sortOrder",
      "unlockAt",
      "externalUrl"
    FROM "LessonItem"
    WHERE "lessonId" IN (${lessonIds})
    ORDER BY "sortOrder" ASC
  `);

  const itemsByLesson = new Map<string, LessonItemRow[]>();
  rawItems.forEach((item) => {
    if (!itemsByLesson.has(item.lessonId)) itemsByLesson.set(item.lessonId, []);
    itemsByLesson.get(item.lessonId)!.push({
      itemId: item.itemId,
      itemType: item.itemType,
      sourceId: item.sourceId,
      titleSnapshot: item.titleSnapshot,
      sortOrder: item.sortOrder,
      unlockAt: item.unlockAt,
      externalUrl: item.externalUrl,
    });
  });

  const lessonsByChapter = new Map<string, LessonRow[]>();
  rawLessons.forEach((l) => {
    if (!lessonsByChapter.has(l.chapterId)) lessonsByChapter.set(l.chapterId, []);
    lessonsByChapter.get(l.chapterId)!.push({
      lessonId: l.lessonId,
      title: l.title,
      sortOrder: l.sortOrder,
      items: itemsByLesson.get(l.lessonId) ?? [],
    });
  });

  const chaptersBySection = new Map<string, ChapterRow[]>();
  rawChapters.forEach((c) => {
    if (!chaptersBySection.has(c.sectionId)) chaptersBySection.set(c.sectionId, []);
    chaptersBySection.get(c.sectionId)!.push({
      chapterId: c.chapterId,
      title: c.title,
      sortOrder: c.sortOrder,
      lessons: lessonsByChapter.get(c.chapterId) ?? [],
    });
  });

  const curriculum: SectionRow[] = rawSections.map((s) => ({
    ...s,
    chapters: chaptersBySection.get(s.sectionId) ?? [],
  }));

  return { ...course, curriculum };
}

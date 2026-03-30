import { prisma } from "@/lib/db";
import { subjectColorFromName } from "@/lib/subjectColor";
import { withCourseContext, type CourseContext } from "@/lib/courseNav";
import { unstable_cache } from "next/cache";

/**
 * Wraps an async function so it returns `fallback` instead of throwing.
 * Used inside unstable_cache wrappers so that DB errors (e.g. Neon 402 quota)
 * are cached as empty state for the TTL rather than being re-fetched every render.
 */
function withFallback<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  fallback: TReturn,
  label: string,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(`[courseDb:${label}] DB query failed, caching fallback:`, (err as Error).message);
      return fallback;
    }
  };
}

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
  isFree: boolean;
  mrp: number | null;
  sellingPrice: number | null;
  discountPercent: number | null;
  packageId: string | null;
  validityType: string | null;
  validityDays: number | null;
  validityMonths: number | null;
  validUntil: Date | null;
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
  subjectColor: string | null;
  label: string | null;
  sortOrder: number;
  chapters: ChapterRow[];
}

export interface CourseDetail extends CourseListItem {
  curriculum: SectionRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function itemUrl(item: LessonItemRow, ctx?: CourseContext): string | null {
  let base: string | null = null;
  switch (item.itemType) {
    case "HTML_PAGE":
      base = item.sourceId ? `/learn/lessons/${item.sourceId}` : null;
      break;
    case "FLASHCARD_DECK":
      base = item.sourceId ? `/learn/flashcards/${item.sourceId}` : null;
      break;
    case "PDF":
      base = item.sourceId ? `/learn/pdfs` : null;
      break;
    case "VIDEO":
      base = item.sourceId ? `/videos/${item.sourceId}` : null;
      break;
    case "QUIZ":
      base = item.sourceId ? `/testhub/tests/${item.sourceId}/brief` : null;
      break;
    case "EXTERNAL_LINK":
      return item.externalUrl ?? null;
    default:
      return null;
  }
  if (!base) return null;
  return ctx ? withCourseContext(base, ctx) : base;
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
  isFree: boolean;
  mrp: number | null;
  sellingPrice: number | null;
  packageId: string | null;
  validityType: string | null;
  validityDays: number | null;
  validityMonths: number | null;
  validUntil: Date | null;
};

function computeDiscount(mrp: number | null, selling: number | null): number | null {
  if (!mrp || mrp <= 0 || !selling || selling <= 0 || mrp <= selling) return null;
  return Math.round(((mrp - selling) / mrp) * 100);
}

function mapCourse(r: RawCourse): CourseListItem {
  // Neon HTTP adapter returns NUMERIC columns as strings — coerce to number.
  const mrp          = r.mrp          != null ? Number(r.mrp)          : null;
  const sellingPrice = r.sellingPrice  != null ? Number(r.sellingPrice)  : null;
  return {
    ...r,
    mrp,
    sellingPrice,
    productCategoryLabel: PRODUCT_CATEGORY_LABEL[r.productCategory] ?? r.productCategory,
    discountPercent: computeDiscount(mrp, sellingPrice),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Cached list of all exam categories.
 * Shared across the public course catalog and student course browser so both
 * pages use a single cached round-trip instead of separate uncached fetches.
 */
async function _getAllCategories(): Promise<{ id: string; name: string }[]> {
  try {
    return await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}
export const getCachedCategories = unstable_cache(
  _getAllCategories,
  ["all-categories"],
  { revalidate: 120, tags: ["categories"] },
);

/**
 * Return all exams belonging to a given category.
 * Exam is admin-owned → raw SQL.
 */
async function _getExamsForCategory(categoryId: string): Promise<ExamItem[]> {
  const safeId = categoryId.replace(/'/g, "''");
  const rows = await prisma.$queryRawUnsafe<ExamItem[]>(`
    SELECT id, name, slug, "categoryId"
    FROM "Exam"
    WHERE "categoryId" = '${safeId}'
    ORDER BY name ASC
  `);
  return rows;
}

export const getExamsForCategory = unstable_cache(
  withFallback(_getExamsForCategory, [], "getExamsForCategory"),
  ["exams-for-category"],
  { revalidate: 120, tags: ["exams"] },
);

/**
 * Fetch active courses with optional filters.
 * Course is admin-owned → queried via raw SQL.
 */
async function _getActiveCourses(opts?: {
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
      c."hasFlashcardDecks",
      COALESCE(c."isFree", false) AS "isFree",
      c.mrp,
      c."sellingPrice",
      c."validityType",
      c."validityDays",
      c."validityMonths",
      c."validUntil",
      pkg.id AS "packageId"
    FROM "Course" c
    LEFT JOIN "Category" cat ON cat.id = c."categoryId"
    LEFT JOIN "Exam"     e   ON e.id   = c."examId"
    LEFT JOIN LATERAL (
      SELECT id FROM "ProductPackage"
      WHERE "isActive" = true
        AND "entitlementCodes" @> ARRAY[c."productCategory"]::text[]
      ORDER BY "pricePaise" ASC
      LIMIT 1
    ) pkg ON true
    WHERE ${where}
    ORDER BY c.featured DESC, c."createdAt" DESC
    ${limitClause}
  `);

  return rows.map(mapCourse);
}

export const getActiveCourses = unstable_cache(
  withFallback(_getActiveCourses, [], "getActiveCourses"),
  ["active-courses"],
  { revalidate: 60, tags: ["courses"] },
);

/**
 * Fetch a single course with its full curriculum tree.
 * Only PUBLISHED lessons are included.
 */
async function _getCourseWithCurriculum(courseId: string): Promise<CourseDetail | null> {
  const safeId = courseId.replace(/'/g, "''");

  // PERFORMANCE: run course header + sections + chapters all in parallel.
  // Chapters are fetched via CSS JOIN on courseId — no need to wait for sectionIds first.
  type RawSection = { sectionId: string; subjectId: string | null; subjectName: string; subjectColor: string | null; label: string | null; sortOrder: number };
  type RawChapter = { chapterId: string; sectionId: string; title: string; sortOrder: number };
  const [courses, rawSections, rawChapters] = await Promise.all([
    prisma.$queryRawUnsafe<RawCourse[]>(`
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
        c."hasFlashcardDecks",
        COALESCE(c."isFree", false) AS "isFree",
        c.mrp,
        c."sellingPrice",
        c."validityType",
        c."validityDays",
        c."validityMonths",
        c."validUntil",
        pkg.id AS "packageId"
      FROM "Course" c
      LEFT JOIN "Category" cat ON cat.id = c."categoryId"
      LEFT JOIN "Exam"     e   ON e.id   = c."examId"
      LEFT JOIN LATERAL (
        SELECT id FROM "ProductPackage"
        WHERE "isActive" = true
          AND "entitlementCodes" @> ARRAY[c."productCategory"]::text[]
        ORDER BY "pricePaise" ASC
        LIMIT 1
      ) pkg ON true
      WHERE c.id = '${safeId}' AND c."isActive" = true
      LIMIT 1
    `),
    prisma.$queryRawUnsafe<RawSection[]>(`
      SELECT
        css.id AS "sectionId",
        css."subjectId",
        COALESCE(css.label, s.name, 'Section') AS "subjectName",
        s."subjectColor",
        css.label,
        css."sortOrder"
      FROM "CourseSubjectSection" css
      LEFT JOIN "Subject" s ON s.id = css."subjectId"
      WHERE css."courseId" = '${safeId}'
      ORDER BY css."sortOrder" ASC
    `),
    prisma.$queryRawUnsafe<RawChapter[]>(`
      SELECT ch.id AS "chapterId", ch."sectionId", ch.title, ch."sortOrder"
      FROM "Chapter" ch
      JOIN "CourseSubjectSection" css ON css.id = ch."sectionId"
      WHERE css."courseId" = '${safeId}'
      ORDER BY ch."sortOrder" ASC
    `),
  ]);
  if (!courses.length) return null;
  const course = mapCourse(courses[0]);
  if (!rawSections.length) {
    return { ...course, curriculum: [] };
  }

  // ── Resolve subject colors ────────────────────────────────────────────────
  // Primary source: Subject.subjectColor (already selected in the SQL join above).
  // Fallback: name-based lookup via subjectColorFromName → null (component uses brand purple).
  const resolveColor = (s: { subjectId: string | null; subjectName: string; subjectColor: string | null }): string | null =>
    s.subjectColor ?? subjectColorFromName(s.subjectName) ?? null;
  // ─────────────────────────────────────────────────────────────────────────

  if (!rawChapters.length) {
    return {
      ...course,
      curriculum: rawSections.map((s) => ({ ...s, subjectColor: resolveColor(s), chapters: [] })),
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
        subjectColor: resolveColor(s),
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
    subjectColor: resolveColor(s),
    chapters: chaptersBySection.get(s.sectionId) ?? [],
  }));

  return { ...course, curriculum };
}

export const getCourseWithCurriculum = unstable_cache(
  withFallback(_getCourseWithCurriculum, null, "getCourseWithCurriculum"),
  ["course-curriculum"],
  { revalidate: 60, tags: ["courses"] },
);

// ── Enrolled courses ──────────────────────────────────────────────────────────

/**
 * Returns courses the user has an active entitlement for.
 * Joins UserEntitlement on courseId OR productCategory.
 * Fails soft — returns [] if Course/Exam/Category tables are unavailable.
 */
export async function getEnrolledCourses(userId: string): Promise<CourseListItem[]> {
  const safeUserId = userId.replace(/'/g, "''");
  try {
    const rows = await prisma.$queryRawUnsafe<RawCourse[]>(`
      SELECT DISTINCT ON (c.id)
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
      INNER JOIN "UserEntitlement" ue ON (
        ue."productCode" = c.id
        OR ue."productCode" = c."productCategory"::text
      )
      WHERE c."isActive" = true
        AND ue."userId" = '${safeUserId}'
        AND ue.status   = 'ACTIVE'
        AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
      ORDER BY c.id, c."createdAt" DESC
      LIMIT 50
    `);
    return rows.map(mapCourse);
  } catch {
    return [];
  }
}

// ── Entitlement ───────────────────────────────────────────────────────────────

/**
 * Returns true if the user has an active UserEntitlement for this course.
 * Matches by courseId OR productCategory (same logic as video entitlement).
 * FREE_DEMO courses always return true without a DB round-trip.
 */
export async function checkUserEntitlementForCourse(
  userId: string,
  courseId: string,
  productCategory: string,
): Promise<boolean> {
  if (productCategory === "FREE_DEMO") return true;

  const safeUserId      = userId.replace(/'/g, "''");
  const safeCourseId    = courseId.replace(/'/g, "''");
  const safeProdCat     = productCategory.replace(/'/g, "''");

  const rows = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(`
    SELECT EXISTS (
      SELECT 1
      FROM "UserEntitlement" ue
      WHERE ue."userId"  = '${safeUserId}'
        AND ue.status     = 'ACTIVE'
        AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
        AND (
          ue."productCode" = '${safeCourseId}'
          OR ue."productCode" = '${safeProdCat}'
        )
    ) AS "exists"
  `);
  return rows[0]?.exists ?? false;
}

// ── Linked content (admin-created CourseLinkedContent table) ──────────────────

export interface LinkedContentRow {
  id: string;
  contentType: string;
  contentId: string;
  title: string;
  sortOrder: number;
}

const LINKED_CONTENT_URL: Record<string, (id: string) => string> = {
  VIDEO:          (id) => `/videos/${id}`,
  FLASHCARD_DECK: (id) => `/learn/flashcards/${id}`,
  HTML_PAGE:      (id) => `/learn/lessons/${id}`,
  EBOOK:          (id) => `/learn/lessons/${id}`,
  PDF:            () => `/learn/pdfs`,
  TEST_SERIES:    (id) => `/testhub/tests/${id}/brief`,
};

export function linkedContentUrl(row: LinkedContentRow, ctx?: CourseContext): string | null {
  const fn = LINKED_CONTENT_URL[row.contentType];
  if (!fn) return null;
  const base = fn(row.contentId);
  return ctx ? withCourseContext(base, ctx) : base;
}

const LINKED_CONTENT_SECTION_LABEL: Record<string, string> = {
  TEST_SERIES:    "Included Test Series",
  VIDEO:          "Included Videos",
  FLASHCARD_DECK: "Included Flashcard Decks",
  HTML_PAGE:      "Included E-Books",
  PDF:            "Included PDFs",
};

export function linkedContentSectionLabel(contentType: string): string {
  return LINKED_CONTENT_SECTION_LABEL[contentType] ?? "Included Content";
}

/**
 * Fetches linked content items for a course from the admin-owned
 * CourseLinkedContent table. Returns an empty array if the table
 * does not exist yet (fail-soft).
 */
async function _getLinkedContentForCourse(courseId: string): Promise<LinkedContentRow[]> {
  const safeId = courseId.replace(/'/g, "''");
  try {
    return await prisma.$queryRawUnsafe<LinkedContentRow[]>(`
      SELECT id, "contentType", "contentId", title, "sortOrder"
      FROM "CourseLinkedContent"
      WHERE "courseId" = '${safeId}' AND "isActive" = true
      ORDER BY "sortOrder" ASC
    `);
  } catch {
    return [];
  }
}

export const getLinkedContentForCourse = unstable_cache(
  withFallback(_getLinkedContentForCourse, [], "getLinkedContentForCourse"),
  ["linked-content-for-course"],
  { revalidate: 60, tags: ["courses"] },
);

/**
 * courseNav.ts
 *
 * Single source of truth for course-aware navigation.
 *
 * When content (flashcard, ebook, PDF, video, test) is opened FROM a course
 * lesson, the originating URL carries three optional query params:
 *
 *   courseId  — the course the user came from (required for context)
 *   lessonId  — the lesson inside the course (optional)
 *   itemId    — the specific LessonItem (optional)
 *
 * Content pages read these params and override their back-navigation link
 * to return the user to the same course (and lesson) instead of the generic
 * content listing page.
 *
 * Standalone flows (direct URL, new tab, listing page navigation) are
 * completely unaffected — context is only activated when courseId is present.
 */

export const COURSE_NAV_PARAMS = {
  courseId: "courseId",
  lessonId: "lessonId",
  itemId:   "itemId",
} as const;

export interface CourseContext {
  courseId: string;
  lessonId?: string;
  itemId?:   string;
}

/**
 * Appends course-context query params to a content URL.
 *
 * @param baseUrl  The plain content URL, e.g. "/learn/flashcards/abc"
 * @param ctx      The course context to embed
 * @returns        URL with context params appended
 */
export function withCourseContext(baseUrl: string, ctx: CourseContext): string {
  if (!baseUrl) return baseUrl;
  const url = new URL(baseUrl, "http://x");
  url.searchParams.set(COURSE_NAV_PARAMS.courseId, ctx.courseId);
  if (ctx.lessonId) url.searchParams.set(COURSE_NAV_PARAMS.lessonId, ctx.lessonId);
  if (ctx.itemId)   url.searchParams.set(COURSE_NAV_PARAMS.itemId, ctx.itemId);
  return url.pathname + url.search;
}

/**
 * Parses course context from Next.js searchParams.
 * Works with both server-component searchParams and client URLSearchParams.
 *
 * @param searchParams  Next.js searchParams object (Record<string, string | string[] | undefined>)
 * @returns             CourseContext if courseId is present, otherwise null
 */
export function parseCourseContext(
  searchParams: Record<string, string | string[] | undefined>,
): CourseContext | null {
  const raw = (key: string) => {
    const v = searchParams[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };

  const courseId = raw(COURSE_NAV_PARAMS.courseId);
  if (!courseId) return null;

  return {
    courseId,
    lessonId: raw(COURSE_NAV_PARAMS.lessonId),
    itemId:   raw(COURSE_NAV_PARAMS.itemId),
  };
}

/**
 * Computes the URL to return the user to after they exit a content page.
 *
 * Priority:
 *  1. If courseId + lessonId exist → /courses/[courseId] (lesson is in the accordion)
 *  2. If courseId only             → /courses/[courseId]
 *
 * @param ctx   CourseContext parsed from the current page's query params
 * @returns     Destination URL string
 */
export function courseReturnUrl(ctx: CourseContext): string {
  return `/courses/${ctx.courseId}`;
}

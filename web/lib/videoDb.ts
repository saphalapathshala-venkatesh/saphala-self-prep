import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  facultyId: string | null;
  facultyName: string | null;
  courseId: string | null;
  categoryId: string | null;
  accessType: string;
  status: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  provider: string;
  providerVideoId: string | null;
  hlsUrl: string | null;
  playbackUrl: string | null;
  allowPreview: boolean;
  unlockAt: Date | null;
  publishedAt: Date | null;
  isEntitled: boolean;
  xpEnabled: boolean;
  xpValue: number;
}

export interface CourseSuggestion {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  sellingPrice: number | null;
  mrp: number | null;
  isFree: boolean;
  hasVideoCourse: boolean;
  categoryName: string | null;
}

// ── Entitlement SQL ───────────────────────────────────────────────────────────

function videoEntitlementExpr(userId: string): string {
  const safeUserId = userId.replace(/'/g, "''");
  return `
    CASE
      WHEN v."accessType" = 'FREE' THEN true
      WHEN v."courseId" IS NULL    THEN false
      ELSE EXISTS (
        SELECT 1
        FROM "UserEntitlement" ue
        WHERE ue."userId"    = '${safeUserId}'
          AND ue.status       = 'ACTIVE'
          AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
          AND ue."productCode" = v."courseId"
      )
    END
  `.trim();
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getVideosForStudent(opts: {
  userId: string;
  courseId?: string;
  categoryId?: string;
  limit?: number;
} = { userId: "" }): Promise<VideoRow[]> {
  const { userId, courseId, categoryId, limit = 60 } = opts;

  const conditions = [`v.status = 'PUBLISHED'`];

  if (courseId) {
    const safe = courseId.replace(/'/g, "''");
    conditions.push(`v."courseId" = '${safe}'`);
  }
  if (categoryId) {
    const safe = categoryId.replace(/'/g, "''");
    conditions.push(`v."categoryId" = '${safe}'`);
  }

  const where = conditions.join(" AND ");

  const rows = await prisma.$queryRawUnsafe<VideoRow[]>(`
    SELECT
      v.id,
      v.title,
      v.description,
      v."facultyId",
      f.name         AS "facultyName",
      v."courseId",
      v."categoryId",
      v."accessType",
      v.status,
      v."durationSeconds",
      v."thumbnailUrl",
      v.provider,
      v."providerVideoId",
      v."hlsUrl",
      v."playbackUrl",
      v."allowPreview",
      v."unlockAt",
      v."publishedAt",
      v."xpEnabled",
      v."xpValue",
      ${videoEntitlementExpr(userId)} AS "isEntitled"
    FROM "Video" v
    LEFT JOIN "Faculty" f ON f.id = v."facultyId"
    LEFT JOIN "Course"  c ON c.id = v."courseId"
    WHERE ${where}
    ORDER BY v."publishedAt" DESC NULLS LAST, v."createdAt" DESC
    LIMIT ${Number(limit)}
  `);

  return rows;
}

export async function getVideoById(id: string, userId: string): Promise<VideoRow | null> {
  const safeId = id.replace(/'/g, "''");

  const rows = await prisma.$queryRawUnsafe<VideoRow[]>(`
    SELECT
      v.id,
      v.title,
      v.description,
      v."facultyId",
      f.name         AS "facultyName",
      v."courseId",
      v."categoryId",
      v."accessType",
      v.status,
      v."durationSeconds",
      v."thumbnailUrl",
      v.provider,
      v."providerVideoId",
      v."hlsUrl",
      v."playbackUrl",
      v."allowPreview",
      v."unlockAt",
      v."publishedAt",
      v."xpEnabled",
      v."xpValue",
      ${videoEntitlementExpr(userId)} AS "isEntitled"
    FROM "Video" v
    LEFT JOIN "Faculty" f ON f.id = v."facultyId"
    LEFT JOIN "Course"  c ON c.id = v."courseId"
    WHERE v.id = '${safeId}'
      AND v.status = 'PUBLISHED'
  `);

  return rows.length ? rows[0] : null;
}

/**
 * Returns only the courses that ACTUALLY contain this video —
 * no false suggestions from unrelated courses.
 *
 * Two sources are checked and de-duplicated:
 *  1. Video.courseId  — the direct owning course (current architecture)
 *  2. CourseContentItem where itemType = 'VIDEO' and sourceId = videoId
 *     — future many-to-many path when a video is added to multiple courses
 *
 * Never suggests courses from the same category that don't
 * actually include this video, to avoid purchase confusion.
 */
export async function getCoursesForVideo(
  videoId: string,
  courseId: string | null,
): Promise<CourseSuggestion[]> {
  const safeVideoId = videoId.replace(/'/g, "''");

  // Collect distinct course IDs that truly contain this video
  const courseIdSet = new Set<string>();
  if (courseId) courseIdSet.add(courseId);

  // Also check CourseContentItem for any multi-course links (future-proof)
  try {
    const linkedRows = await prisma.$queryRawUnsafe<{ courseId: string }[]>(`
      SELECT DISTINCT "courseId"
      FROM "CourseContentItem"
      WHERE "itemType" = 'VIDEO'
        AND "sourceId" = '${safeVideoId}'
    `);
    linkedRows.forEach((r) => courseIdSet.add(r.courseId));
  } catch {
    // Table may not have VIDEO rows yet — safe to ignore
  }

  if (courseIdSet.size === 0) return [];

  const idList = [...courseIdSet]
    .map((id) => `'${id.replace(/'/g, "''")}'`)
    .join(", ");

  const rows = await prisma.$queryRawUnsafe<CourseSuggestion[]>(`
    SELECT
      c.id,
      c.name,
      c."thumbnailUrl",
      c."sellingPrice",
      c.mrp,
      c."isFree",
      c."hasVideoCourse",
      cat.name AS "categoryName"
    FROM "Course" c
    LEFT JOIN "Category" cat ON cat.id = c."categoryId"
    WHERE c.id IN (${idList})
      AND c."isActive" = true
    ORDER BY c."featured" DESC NULLS LAST, c.name ASC
  `);

  return rows;
}

/**
 * Format seconds → "1h 23m" or "45m"
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  return `${m}m`;
}

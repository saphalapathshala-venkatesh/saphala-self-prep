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
      AND (v."unlockAt" IS NULL OR v."unlockAt" <= NOW() OR ${videoEntitlementExpr(userId)})
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
 * Given a video's courseId and categoryId, return up to 3 course suggestions
 * the student can purchase to unlock the video.
 * Priority: 1) the direct owning course, 2) other active courses in same category.
 */
export async function getCoursesForVideo(
  courseId: string | null,
  categoryId: string | null,
): Promise<CourseSuggestion[]> {
  const results: CourseSuggestion[] = [];

  // 1. Fetch the primary course that directly owns this video
  if (courseId) {
    const safe = courseId.replace(/'/g, "''");
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
      WHERE c.id = '${safe}'
        AND c."isActive" = true
      LIMIT 1
    `);
    results.push(...rows);
  }

  // 2. Fill remaining slots with related courses from the same category
  const remaining = 3 - results.length;
  if (remaining > 0) {
    const excludeList = results.map((r) => `'${r.id.replace(/'/g, "''")}'`).join(", ") || `''`;

    // Determine category: from the primary course or from the video's own categoryId
    const catFilter = (() => {
      if (categoryId) {
        const safe = categoryId.replace(/'/g, "''");
        return `AND c."categoryId" = '${safe}'`;
      }
      if (courseId) {
        const safe = courseId.replace(/'/g, "''");
        return `AND c."categoryId" = (SELECT "categoryId" FROM "Course" WHERE id = '${safe}' LIMIT 1)`;
      }
      return "";
    })();

    if (catFilter) {
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
        WHERE c."isActive" = true
          AND c."hasVideoCourse" = true
          AND c.id NOT IN (${excludeList})
          ${catFilter}
        ORDER BY c."featured" DESC NULLS LAST, c."createdAt" DESC
        LIMIT ${remaining}
      `);
      results.push(...rows);
    }
  }

  return results;
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

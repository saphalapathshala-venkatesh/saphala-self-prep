import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  facultyId: string | null;
  facultyName: string | null;
  courseId: string | null;
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
          AND (
            ue."productCode" = v."courseId"
            OR ue."productCode" = c."productCategory"::text
          )
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
 * Format seconds → "1h 23m" or "45m"
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  return `${m}m`;
}

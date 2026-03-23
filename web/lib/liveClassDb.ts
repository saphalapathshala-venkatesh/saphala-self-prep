import { prisma } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LiveStatus = "UPCOMING" | "LIVE_NOW" | "COMPLETED" | "LOCKED" | "ENDED";

export interface LiveClassRow {
  id: string;
  title: string;
  description: string | null;
  facultyId: string | null;
  facultyName: string | null;
  facultyTitle: string | null;
  courseId: string | null;
  categoryId: string | null;
  sessionDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  platform: string;
  accessType: string;
  joinUrl: string | null;
  sessionCode: string | null;
  thumbnailUrl: string | null;
  replayVideoId: string | null;
  unlockAt: Date | null;
  zoomPassword: string | null;
  durationMinutes: number | null;
  isEntitled: boolean;
}

export interface LiveClassStudent extends LiveClassRow {
  liveStatus: LiveStatus;
  canJoin: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute the IST-aware join window for a live class.
 * sessionDate = date portion (admin enters IST date)
 * startTime / endTime = "HH:MM" strings, treated as IST
 */
export function computeLiveStatus(row: LiveClassRow): { liveStatus: LiveStatus; canJoin: boolean } {
  const now = new Date();

  // UnlockAt gate — if not yet unlocked, class is LOCKED
  if (row.unlockAt && row.unlockAt > now) {
    return { liveStatus: "LOCKED", canJoin: false };
  }

  // Entitlement gate — PAID class with no entitlement
  if (!row.isEntitled) {
    return { liveStatus: "LOCKED", canJoin: false };
  }

  if (row.status === "COMPLETED") {
    return { liveStatus: "COMPLETED", canJoin: false };
  }

  // For PUBLISHED classes, compute time-based status
  if (row.status === "PUBLISHED") {
    if (!row.sessionDate || !row.startTime) {
      return { liveStatus: "UPCOMING", canJoin: false };
    }

    // Extract date string from sessionDate (YYYY-MM-DD)
    const d = new Date(row.sessionDate);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    // Parse HH:MM — treat as IST (+05:30)
    const [startH, startM] = row.startTime.split(":").map(Number);
    const startISO = `${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00+05:30`;
    const startDateTime = new Date(startISO);
    const joinWindowStart = new Date(startDateTime.getTime() - 10 * 60 * 1000);

    let endDateTime: Date;
    if (row.endTime) {
      const [endH, endM] = row.endTime.split(":").map(Number);
      const endISO = `${dateStr}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00+05:30`;
      endDateTime = new Date(endISO);
    } else {
      endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
    }

    const canJoin = now >= joinWindowStart && now <= endDateTime && !!row.joinUrl;

    if (now < joinWindowStart) return { liveStatus: "UPCOMING", canJoin };
    if (now <= endDateTime) return { liveStatus: "LIVE_NOW", canJoin };
    return { liveStatus: "ENDED", canJoin: false };
  }

  return { liveStatus: "UPCOMING", canJoin: false };
}

// ── Entitlement SQL fragment ──────────────────────────────────────────────────

/**
 * Builds the SQL CASE expression for entitlement check.
 * FREE classes → always entitled.
 * PAID classes → check UserEntitlement by courseId or course productCategory.
 */
function entitlementExpr(userId: string): string {
  const safeUserId = userId.replace(/'/g, "''");
  return `
    CASE
      WHEN lc."accessType" = 'FREE' THEN true
      WHEN lc."courseId" IS NULL    THEN false
      ELSE EXISTS (
        SELECT 1
        FROM "UserEntitlement" ue
        WHERE ue."userId"    = '${safeUserId}'
          AND ue.status       = 'ACTIVE'
          AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
          AND (
            ue."productCode" = lc."courseId"
            OR ue."productCode" = c."productCategory"
          )
      )
    END
  `.trim();
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch student-visible live classes (PUBLISHED + COMPLETED).
 * Optional filters: courseId, categoryId.
 */
export async function getLiveClassesForStudent(opts: {
  userId: string;
  courseId?: string;
  categoryId?: string;
  limit?: number;
} = { userId: "" }): Promise<LiveClassStudent[]> {
  const { userId, courseId, categoryId, limit = 50 } = opts;

  const conditions: string[] = [`lc.status IN ('PUBLISHED', 'COMPLETED')`];

  if (courseId) {
    const safe = courseId.replace(/'/g, "''");
    conditions.push(`lc."courseId" = '${safe}'`);
  }
  if (categoryId) {
    const safe = categoryId.replace(/'/g, "''");
    conditions.push(`lc."categoryId" = '${safe}'`);
  }

  const where = conditions.join(" AND ");

  const rows = await prisma.$queryRawUnsafe<LiveClassRow[]>(`
    SELECT
      lc.id,
      lc.title,
      lc.description,
      lc."facultyId",
      f.name       AS "facultyName",
      f.title      AS "facultyTitle",
      lc."courseId",
      lc."categoryId",
      lc."sessionDate",
      lc."startTime",
      lc."endTime",
      lc.status,
      lc.platform,
      lc."accessType",
      lc."joinUrl",
      lc."sessionCode",
      lc."thumbnailUrl",
      lc."replayVideoId",
      lc."unlockAt",
      lc."zoomPassword",
      NULL::int    AS "durationMinutes",
      ${entitlementExpr(userId)} AS "isEntitled"
    FROM "LiveClass" lc
    LEFT JOIN "Faculty" f  ON f.id  = lc."facultyId"
    LEFT JOIN "Course"  c  ON c.id  = lc."courseId"
    WHERE ${where}
    ORDER BY lc."sessionDate" ASC NULLS LAST, lc."startTime" ASC NULLS LAST
    LIMIT ${Number(limit)}
  `);

  return rows.map((r) => ({ ...r, ...computeLiveStatus(r) }));
}

/**
 * Fetch a single student-visible live class by ID.
 */
export async function getLiveClassById(id: string, userId: string): Promise<LiveClassStudent | null> {
  const safeId = id.replace(/'/g, "''");

  const rows = await prisma.$queryRawUnsafe<LiveClassRow[]>(`
    SELECT
      lc.id,
      lc.title,
      lc.description,
      lc."facultyId",
      f.name       AS "facultyName",
      f.title      AS "facultyTitle",
      lc."courseId",
      lc."categoryId",
      lc."sessionDate",
      lc."startTime",
      lc."endTime",
      lc.status,
      lc.platform,
      lc."accessType",
      lc."joinUrl",
      lc."sessionCode",
      lc."thumbnailUrl",
      lc."replayVideoId",
      lc."unlockAt",
      lc."zoomPassword",
      NULL::int    AS "durationMinutes",
      ${entitlementExpr(userId)} AS "isEntitled"
    FROM "LiveClass" lc
    LEFT JOIN "Faculty" f  ON f.id  = lc."facultyId"
    LEFT JOIN "Course"  c  ON c.id  = lc."courseId"
    WHERE lc.id = '${safeId}'
      AND lc.status IN ('PUBLISHED', 'COMPLETED')
  `);

  if (!rows.length) return null;
  const r = rows[0];
  return { ...r, ...computeLiveStatus(r) };
}

/**
 * Fetch the nearest upcoming or live class for the dashboard card.
 * Returns null if no relevant class exists.
 */
export async function getDashboardLiveClass(userId: string): Promise<LiveClassStudent | null> {
  const safeUserId = userId.replace(/'/g, "''");

  const rows = await prisma.$queryRawUnsafe<LiveClassRow[]>(`
    SELECT
      lc.id,
      lc.title,
      lc.description,
      lc."facultyId",
      f.name       AS "facultyName",
      f.title      AS "facultyTitle",
      lc."courseId",
      lc."categoryId",
      lc."sessionDate",
      lc."startTime",
      lc."endTime",
      lc.status,
      lc.platform,
      lc."accessType",
      lc."joinUrl",
      lc."sessionCode",
      lc."thumbnailUrl",
      lc."replayVideoId",
      lc."unlockAt",
      lc."zoomPassword",
      NULL::int    AS "durationMinutes",
      CASE
        WHEN lc."accessType" = 'FREE' THEN true
        WHEN lc."courseId" IS NULL    THEN false
        ELSE EXISTS (
          SELECT 1
          FROM "UserEntitlement" ue
          WHERE ue."userId"    = '${safeUserId}'
            AND ue.status       = 'ACTIVE'
            AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
            AND (
              ue."productCode" = lc."courseId"
              OR ue."productCode" = c."productCategory"
            )
        )
      END AS "isEntitled"
    FROM "LiveClass" lc
    LEFT JOIN "Faculty" f  ON f.id  = lc."facultyId"
    LEFT JOIN "Course"  c  ON c.id  = lc."courseId"
    WHERE lc.status = 'PUBLISHED'
      AND (lc."unlockAt" IS NULL OR lc."unlockAt" <= NOW())
    ORDER BY lc."sessionDate" ASC NULLS LAST, lc."startTime" ASC NULLS LAST
    LIMIT 1
  `);

  if (!rows.length) return null;
  const r = rows[0];
  return { ...r, ...computeLiveStatus(r) };
}

/**
 * Format a sessionDate + startTime / endTime as a readable IST string.
 */
export function formatSessionDateTime(
  sessionDate: Date | null,
  startTime: string | null,
  endTime: string | null
): string {
  if (!sessionDate) return "Date TBA";

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(sessionDate));

  if (!startTime) return dateLabel;
  const timePart = endTime ? `${startTime} – ${endTime} IST` : `${startTime} IST`;
  return `${dateLabel} · ${timePart}`;
}

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
  joinOpensAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute the IST-aware join window for a live class.
 * sessionDate = date portion (admin enters IST date)
 * startTime / endTime = "HH:MM" strings, treated as IST
 */
export function computeLiveStatus(row: LiveClassRow): {
  liveStatus: LiveStatus;
  canJoin: boolean;
  joinOpensAt: string | null;  // "HH:MM AM/PM IST" label, or null
} {
  const now = new Date();

  // UnlockAt gate — unlockAt is stored as true UTC (admin app appends +05:30 on save)
  if (row.unlockAt && row.unlockAt > now) {
    return { liveStatus: "LOCKED", canJoin: false, joinOpensAt: null };
  }

  // Entitlement gate — PAID class with no entitlement
  if (!row.isEntitled) {
    return { liveStatus: "LOCKED", canJoin: false, joinOpensAt: null };
  }

  if (row.status === "COMPLETED") {
    return { liveStatus: "COMPLETED", canJoin: false, joinOpensAt: null };
  }

  // For PUBLISHED classes, compute time-based status
  if (row.status === "PUBLISHED") {
    if (!row.sessionDate || !row.startTime) {
      return { liveStatus: "UPCOMING", canJoin: false, joinOpensAt: null };
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
    // Join window opens 5 minutes before the scheduled start
    const joinWindowStart = new Date(startDateTime.getTime() - 5 * 60 * 1000);

    let endDateTime: Date;
    if (row.endTime) {
      const [endH, endM] = row.endTime.split(":").map(Number);
      const endISO = `${dateStr}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00+05:30`;
      endDateTime = new Date(endISO);
    } else {
      endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
    }

    const canJoin = now >= joinWindowStart && now <= endDateTime && !!row.joinUrl;

    // Build "join opens at HH:MM AM/PM IST" label from the join window start
    const joinOpensAt = buildJoinOpensAt(joinWindowStart);

    if (now < joinWindowStart) return { liveStatus: "UPCOMING", canJoin, joinOpensAt };
    if (now <= endDateTime) return { liveStatus: "LIVE_NOW", canJoin, joinOpensAt: null };
    return { liveStatus: "ENDED", canJoin: false, joinOpensAt: null };
  }

  return { liveStatus: "UPCOMING", canJoin: false, joinOpensAt: null };
}

/** Format a UTC Date as "H:MM AM/PM IST" for display in the join-opens-at label */
function buildJoinOpensAt(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " IST";
}

// ── Entitlement SQL fragment ──────────────────────────────────────────────────

/**
 * Builds the SQL CASE expression for entitlement check.
 *
 * A student is entitled when ANY of the following is true:
 *  1. accessType = 'FREE'
 *  2. LiveClass.courseId matches an active UserEntitlement    (legacy single-course)
 *  3. ANY row in LiveClassCourse for this class matches an
 *     active UserEntitlement                                  (multi-course — new)
 *
 * Using OR between (2) and (3) means both paths work simultaneously —
 * no data needs to be migrated. A student enrolled in ANY of the
 * linked courses gets access.
 */
function entitlementExpr(userId: string): string {
  const safe = userId.replace(/'/g, "''");
  return `
    CASE
      WHEN lc."accessType" = 'FREE' THEN true
      ELSE (
        (
          lc."courseId" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM "UserEntitlement" ue
            WHERE ue."userId"      = '${safe}'
              AND ue."productCode" = lc."courseId"
              AND ue.status        = 'ACTIVE'
              AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
          )
        )
        OR EXISTS (
          SELECT 1
          FROM "LiveClassCourse" lcc
          INNER JOIN "UserEntitlement" ue ON ue."productCode" = lcc."courseId"
          WHERE lcc."liveClassId" = lc.id
            AND ue."userId"       = '${safe}'
            AND ue.status         = 'ACTIVE'
            AND (ue."validUntil" IS NULL OR ue."validUntil" > NOW())
        )
      )
    END
  `.trim();
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch student-visible live classes (PUBLISHED + COMPLETED).
 *
 * courseId filter checks BOTH the legacy direct FK and the
 * LiveClassCourse junction table so filtering by course works
 * regardless of how the admin linked the class.
 *
 * DISTINCT ensures a student enrolled in multiple courses that
 * include the same live class never sees it duplicated.
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
    const safeCourse = courseId.replace(/'/g, "''");
    conditions.push(`(
      lc."courseId" = '${safeCourse}'
      OR EXISTS (
        SELECT 1 FROM "LiveClassCourse" lcc2
        WHERE lcc2."liveClassId" = lc.id AND lcc2."courseId" = '${safeCourse}'
      )
    )`);
  }
  if (categoryId) {
    const safeCat = categoryId.replace(/'/g, "''");
    conditions.push(`lc."categoryId" = '${safeCat}'`);
  }

  const where = conditions.join(" AND ");

  const rows = await prisma.$queryRawUnsafe<LiveClassRow[]>(`
    SELECT DISTINCT ON (lc.id, lc."sessionDate", lc."startTime")
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
    LEFT JOIN "Faculty" f ON f.id = lc."facultyId"
    WHERE ${where}
    ORDER BY lc.id, lc."sessionDate" ASC NULLS LAST, lc."startTime" ASC NULLS LAST
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
    LEFT JOIN "Faculty" f ON f.id = lc."facultyId"
    WHERE lc.id = '${safeId}'
      AND lc.status IN ('PUBLISHED', 'COMPLETED')
  `);

  if (!rows.length) return null;
  return { ...rows[0], ...computeLiveStatus(rows[0]) };
}

/**
 * Fetch the nearest upcoming or live class for the dashboard card.
 * Prefers classes the student is entitled to (LIVE_NOW first, then UPCOMING).
 * Falls back to any upcoming class (shown as LOCKED) if none are entitled.
 */
export async function getDashboardLiveClass(userId: string): Promise<LiveClassStudent | null> {
  const rows = await prisma.$queryRawUnsafe<LiveClassRow[]>(`
    SELECT DISTINCT ON (lc.id)
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
    LEFT JOIN "Faculty" f ON f.id = lc."facultyId"
    WHERE lc.status = 'PUBLISHED'
      AND (lc."unlockAt" IS NULL OR lc."unlockAt" <= NOW())
    ORDER BY lc.id, lc."sessionDate" ASC NULLS LAST, lc."startTime" ASC NULLS LAST
    LIMIT 10
  `);

  if (!rows.length) return null;

  // Map to live status and prefer entitled + live/upcoming classes
  const withStatus = rows.map((r) => ({ ...r, ...computeLiveStatus(r) }));
  const entitled = withStatus.filter((r) => r.liveStatus !== "LOCKED");
  const liveNow = entitled.find((r) => r.liveStatus === "LIVE_NOW");
  if (liveNow) return liveNow;
  const upcoming = entitled.find((r) => r.liveStatus === "UPCOMING");
  if (upcoming) return upcoming;
  // Fallback: show any class (locked) so the dashboard card isn't empty
  return withStatus[0];
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

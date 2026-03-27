/**
 * Sadhana Streak — computed from XpLedgerEntry.createdAt
 *
 * "Day" boundary: midnight IST (Asia/Kolkata = UTC+5:30).
 * 12 AM IST = 18:30 UTC of the previous calendar day.
 *
 * Streak rules:
 *  - Any calendar day (IST) with ≥1 XpLedgerEntry counts as an "active day"
 *  - Current streak  = consecutive active days ending today OR yesterday (IST).
 *                      Allowing yesterday means the day's not lost until 11:59 PM IST.
 *  - Longest streak  = max run of consecutive active days in history.
 *  - Existing users: computed from their full XpLedgerEntry history (no backfill needed).
 */

import { prisma } from "./db";

export interface UserStreak {
  current: number;          // current consecutive-day streak
  longest: number;          // all-time best
  lastActiveDate: Date | null; // most recent IST calendar day with XP
  activeDaysLast7: string[];   // ISO date strings (IST) for last 7 days that had XP
  todayActive: boolean;        // did user earn any XP today (IST)?
}

export async function getUserStreak(userId: string): Promise<UserStreak> {
  // Run both queries in parallel — they are independent reads on the same table.
  const [rows, activeDaysRows] = await Promise.all([
    prisma.$queryRawUnsafe<
      { current_streak: number; longest_streak: number; last_active: string | null }[]
    >(`
      WITH days AS (
        SELECT DISTINCT
          (e."createdAt" AT TIME ZONE 'Asia/Kolkata')::date AS d
        FROM "XpLedgerEntry" e
        WHERE e."userId" = $1
      ),
      with_lag AS (
        SELECT d,
               LAG(d) OVER (ORDER BY d) AS prev_d
        FROM days
      ),
      groups AS (
        SELECT d,
               SUM(CASE
                 WHEN prev_d IS NULL OR d - prev_d > 1 THEN 1
                 ELSE 0
               END) OVER (ORDER BY d ROWS UNBOUNDED PRECEDING) AS g
        FROM with_lag
      ),
      runs AS (
        SELECT g, COUNT(*) AS len, MAX(d) AS last_d
        FROM groups
        GROUP BY g
      )
      SELECT
        COALESCE(
          (SELECT len
           FROM runs
           WHERE last_d >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 1
           ORDER BY last_d DESC
           LIMIT 1),
          0
        )::int                                       AS current_streak,
        COALESCE(MAX(len), 0)::int                   AS longest_streak,
        (SELECT MAX(d)::text FROM days)              AS last_active
      FROM runs
    `, userId),

    prisma.$queryRawUnsafe<{ d: string }[]>(`
      SELECT DISTINCT (e."createdAt" AT TIME ZONE 'Asia/Kolkata')::date::text AS d
      FROM "XpLedgerEntry" e
      WHERE e."userId" = $1
        AND (e."createdAt" AT TIME ZONE 'Asia/Kolkata')::date
            >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6
      ORDER BY d
    `, userId),
  ]);

  const result = rows[0] ?? { current_streak: 0, longest_streak: 0, last_active: null };

  const activeDaysLast7 = activeDaysRows.map((r: { d: string }) => r.d);

  const todayIST = new Date(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const todayStr = todayIST.toISOString().slice(0, 10);
  const todayActive = activeDaysLast7.includes(todayStr);

  return {
    current: result.current_streak,
    longest: result.longest_streak,
    lastActiveDate: result.last_active ? new Date(result.last_active) : null,
    activeDaysLast7,
    todayActive,
  };
}

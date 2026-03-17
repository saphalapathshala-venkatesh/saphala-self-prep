// All dates displayed to users are formatted in IST (India Standard Time, UTC+5:30).
// Use these helpers everywhere instead of toLocaleDateString / Intl.DateTimeFormat
// without an explicit timeZone — those fall back to the server's UTC timezone on
// Vercel and to the browser's local timezone on the client, both of which can show
// incorrect times for Indian users.
//
// IMPORTANT — nowIST() for unlock checks:
// The admin app stores unlockAt / publishedAt values as naive timestamps (no
// timezone offset).  When an admin in IST types "2026-03-18 01:11", the value
// is saved as-is.  Vercel treats it as UTC, so the content only appears at
// 06:41 IST instead of 01:11 IST — 5h30m late.
// nowIST() returns a Date that represents "what IST looks like as a naive UTC
// value", so comparing it against the stored naive-IST timestamps is correct.
// Use ONLY for content availability checks (unlockAt, scheduledUntil checks).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/**
 * Returns the current IST time as a "naive UTC" Date for comparing against
 * unlockAt / scheduledUntil values stored without timezone in the database.
 * Do NOT use for recording actual event timestamps (use new Date() for those).
 */
export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

const IST = "Asia/Kolkata";

// "17 Mar 2026" — date only, short month
export function formatDateIST(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

// "17 Mar 2026, 06:41 AM" — date + time, short month
export function formatDateTimeIST(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

// "17 March 2026" — date only, long month (used in profile, brief)
export function formatLongDateIST(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

// "March 2026" — month + year only (used in "Member since")
export function formatMonthYearIST(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

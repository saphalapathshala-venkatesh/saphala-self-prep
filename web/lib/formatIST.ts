// All dates displayed to users are formatted in IST (India Standard Time, UTC+5:30).
// Use these helpers everywhere instead of toLocaleDateString / Intl.DateTimeFormat
// without an explicit timeZone — those fall back to the server's UTC timezone on
// Vercel and to the browser's local timezone on the client, both of which can show
// incorrect times for Indian users.
//
// IMPORTANT — unlockAt storage format:
// The admin app appends +05:30 before calling the API, e.g. admin types "10:30"
// → API receives "2026-04-15T10:30:00+05:30" → Node.js converts and stores 05:00 UTC.
// So all unlockAt / scheduledUntil values in the DB are TRUE UTC.
// Standard unlockAt <= NOW() comparisons are therefore correct.
// Use new Date() (not nowIST()) for all availability checks.

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

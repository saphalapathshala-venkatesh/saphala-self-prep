// All dates displayed to users are formatted in IST (India Standard Time, UTC+5:30).
// Use these helpers everywhere instead of toLocaleDateString / Intl.DateTimeFormat
// without an explicit timeZone — those fall back to the server's UTC timezone on
// Vercel and to the browser's local timezone on the client, both of which can show
// incorrect times for Indian users.

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

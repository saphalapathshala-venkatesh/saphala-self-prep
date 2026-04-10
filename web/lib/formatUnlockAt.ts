/**
 * Formats an unlockAt timestamp as a human-readable IST label.
 * Used across all content-type listing pages.
 *
 * Example output: "15 Apr 2026, 10:30 AM IST"
 */
export function formatUnlockAt(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const base = d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${base} IST`;
}

/**
 * Returns true if the given unlockAt value is in the future (item is time-locked).
 */
export function isTimeLocked(unlockAt: string | Date | null | undefined): boolean {
  if (!unlockAt) return false;
  const d = typeof unlockAt === "string" ? new Date(unlockAt) : unlockAt;
  return d > new Date();
}

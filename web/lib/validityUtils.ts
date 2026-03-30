/**
 * Course validity / expiry utilities.
 *
 * All calendar arithmetic is done in IST (Asia/Kolkata, UTC+5:30).
 * The returned Date is always a UTC value stored in PostgreSQL.
 */

export interface ValidityConfig {
  validityType: string | null;
  validityDays: number | null;
  validityMonths: number | null;
}

/** IST is UTC+5:30 = 330 minutes ahead of UTC */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Computes the UTC timestamp at which course access should expire.
 *
 * Rules:
 *  - `lifetime`  → returns null  (no expiry)
 *  - `days`      → adds N calendar days in IST, expires at 23:59:59.999 IST on the Nth day
 *  - `months`    → adds N calendar months in IST (respects month-end), expires at 23:59:59.999 IST
 *  - null / unknown → returns null (no expiry, access never expires by time)
 *
 * Example: purchase on 2025-01-01 IST with 365 days validity
 *  → expires at 23:59:59.999 IST on 2026-01-01 = 18:29:59.999 UTC on 2026-01-01
 *
 * Example: purchase on 2025-01-31 IST with 1 month validity
 *  → expires at 23:59:59.999 IST on 2025-02-28 (month-end cap)
 *
 * @param purchaseDate  The UTC timestamp of the purchase (usually `new Date()`)
 * @param cfg           Validity fields from the Course DB row
 */
export function computeValidUntil(purchaseDate: Date, cfg: ValidityConfig): Date | null {
  const { validityType, validityDays, validityMonths } = cfg;

  if (!validityType || validityType === "lifetime") return null;

  // Get IST date components of the purchase date
  const purchaseIST = new Date(purchaseDate.getTime() + IST_OFFSET_MS);
  const year  = purchaseIST.getUTCFullYear();
  const month = purchaseIST.getUTCMonth(); // 0-indexed (Jan=0)
  const day   = purchaseIST.getUTCDate();

  let expiryYear: number;
  let expiryMonth: number;
  let expiryDay: number;

  if (validityType === "days" && validityDays && Number(validityDays) > 0) {
    const d = Number(validityDays);
    // Add d calendar days using UTC date arithmetic in IST day buckets
    const purchaseDayUTC = Date.UTC(year, month, day);
    const expiryDayUTC   = purchaseDayUTC + d * 86_400_000;
    const expiryObj = new Date(expiryDayUTC);
    expiryYear  = expiryObj.getUTCFullYear();
    expiryMonth = expiryObj.getUTCMonth();
    expiryDay   = expiryObj.getUTCDate();

  } else if (validityType === "months" && validityMonths && Number(validityMonths) > 0) {
    const m = Number(validityMonths);
    const rawMonth = month + m;
    expiryYear  = year + Math.floor(rawMonth / 12);
    expiryMonth = rawMonth % 12;
    // Cap to the last valid day of the expiry month
    // (e.g. Jan 31 + 1 month → Feb 28 or 29)
    const maxDay = new Date(Date.UTC(expiryYear, expiryMonth + 1, 0)).getUTCDate();
    expiryDay = Math.min(day, maxDay);

  } else {
    return null;
  }

  // 23:59:59.999 IST  →  subtract IST offset to get the equivalent UTC moment
  // 23:59:59.999 IST  =  (23*60 + 59)*60*1000 + 59*1000 + 999 ms from midnight IST
  // midnight IST in UTC  =  Date.UTC(y, m, d) - IST_OFFSET_MS
  // therefore expiry UTC  =  Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS
  return new Date(
    Date.UTC(expiryYear, expiryMonth, expiryDay, 23, 59, 59, 999) - IST_OFFSET_MS
  );
}

/**
 * Human-readable description of a validity config (for logging / debugging).
 */
export function describeValidity(cfg: ValidityConfig): string {
  if (!cfg.validityType) return "no-expiry";
  if (cfg.validityType === "lifetime") return "lifetime";
  if (cfg.validityType === "days" && cfg.validityDays)
    return `${cfg.validityDays}d`;
  if (cfg.validityType === "months" && cfg.validityMonths)
    return `${cfg.validityMonths}mo`;
  return "unknown";
}

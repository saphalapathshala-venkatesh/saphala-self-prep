import { NextResponse } from "next/server";
import { getDailyQuote } from "@/data/quotes";

/**
 * GET /api/public/quote-of-the-day
 * Returns the deterministic quote for the current calendar day (IST).
 * Resets at midnight IST via the dayOfYear calculation in getDailyQuote().
 * Cache-Control: public, max-age=<seconds until midnight IST>
 */
export async function GET() {
  const quote = getDailyQuote();

  // Calculate seconds remaining until midnight IST (UTC+5:30).
  const nowUtc = Date.now();
  const nowIst = nowUtc + 5.5 * 60 * 60 * 1000; // shift to IST
  const msIntoDay = nowIst % (24 * 60 * 60 * 1000);
  const msUntilMidnight = 24 * 60 * 60 * 1000 - msIntoDay;
  const secondsUntilMidnight = Math.max(60, Math.floor(msUntilMidnight / 1000));

  return NextResponse.json(quote, {
    headers: {
      "Cache-Control": `public, max-age=${secondsUntilMidnight}, stale-while-revalidate=60`,
    },
  });
}

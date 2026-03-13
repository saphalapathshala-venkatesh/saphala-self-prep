import { NextResponse } from "next/server";
import { getDailyQuote } from "@/data/quotes";

/**
 * GET /api/public/quote-of-the-day
 * Returns the deterministic quote for the current calendar day.
 * The same quote is returned for all requests on the same day.
 * Resets at 12:00 AM via the dayOfYear calculation in getDailyQuote().
 */
export async function GET() {
  const quote = getDailyQuote();
  return NextResponse.json(quote);
}

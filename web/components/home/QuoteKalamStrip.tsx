"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/data/quotes";
import QuoteCard from "@/components/home/QuoteCard";
import KalamTributeCard from "@/components/home/KalamTributeCard";

/**
 * QuoteKalamStrip — compact section below the navbar.
 * - Fetches today's quote from the public API (deterministic, day-stable).
 * - Left 60%: QuoteCard with daily quote.
 * - Right 40%: KalamTributeCard (static dedication).
 * - Stacks vertically on mobile (quote first, tribute second).
 */
export default function QuoteKalamStrip() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    fetch("/api/public/quote-of-the-day")
      .then((r) => r.json())
      .then(setQuote)
      .catch(() =>
        setQuote({
          text: "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
          author: "Dr. A.P.J. Abdul Kalam",
        })
      );
  }, []);

  return (
    <section className="bg-white border-b border-gray-100 py-3 md:py-4">
      <div className="container mx-auto px-4">
        {/* 60 / 40 grid — stacks to single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-3">
          {/* Left — Quote of the Day */}
          <QuoteCard quote={quote} />

          {/* Right — Kalam Tribute */}
          <KalamTributeCard />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Quote {
  text: string;
  author: string;
}

export default function QuoteKalamStrip() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    fetch("/api/public/quote-of-the-day")
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => {
        setQuote({
          text: "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
          author: "Dr. A.P.J. Abdul Kalam",
        });
      });
  }, []);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row min-h-[120px]">
          {/* Left 60% — Quote of the Day */}
          <div className="flex-[3] flex flex-col justify-center py-5 pr-0 md:pr-8 border-b md:border-b-0 md:border-r border-purple-200">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6D4BCB] mb-2">
              Quote of the Day
            </span>
            {quote ? (
              <>
                <blockquote className="text-sm md:text-base text-gray-700 italic leading-relaxed mb-2">
                  &ldquo;{quote.text}&rdquo;
                </blockquote>
                <p className="text-xs font-semibold text-[#2D1B69]">
                  — {quote.author || "Anonymous"}
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-purple-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-purple-100 rounded animate-pulse w-1/2" />
              </div>
            )}
          </div>

          {/* Right 40% — Kalam Dedication Card */}
          <div className="flex-[2] flex items-center gap-4 py-5 pl-0 md:pl-8">
            {/* Kalam Avatar */}
            <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">APJ</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D1B69] mb-1">
                Dr. A.P.J. Abdul Kalam
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                All Saphala learning products are dedicated to the vision,
                values, and educational spirit of Dr. A.P.J. Abdul Kalam.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

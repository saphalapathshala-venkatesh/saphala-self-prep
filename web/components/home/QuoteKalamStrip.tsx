"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
      .catch(() =>
        setQuote({
          text: "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
          author: "Dr. A.P.J. Abdul Kalam",
        })
      );
  }, []);

  return (
    <div className="bg-gradient-to-r from-[#f5f0ff] to-[#ede8ff] border-b border-purple-100">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row min-h-[100px]">
          {/* Left 60% — Quote of the Day */}
          <div className="flex-[3] flex flex-col justify-center py-4 pr-0 md:pr-8 border-b md:border-b-0 md:border-r border-purple-200">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6D4BCB] mb-2">
              ✦ Quote of the Day
            </span>
            {quote ? (
              <>
                <blockquote className="text-sm md:text-[15px] text-gray-700 italic leading-relaxed mb-1.5">
                  &ldquo;{quote.text}&rdquo;
                </blockquote>
                <p className="text-xs font-semibold text-[#2D1B69]">
                  — {quote.author || "Anonymous"}
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-purple-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-purple-100 rounded animate-pulse w-1/3 mt-1" />
              </div>
            )}
          </div>

          {/* Right 40% — Kalam Dedication Card */}
          <div className="flex-[2] flex items-center gap-4 py-4 pl-0 md:pl-8">
            <div className="shrink-0 w-[52px] h-[52px] rounded-full overflow-hidden ring-2 ring-[#6D4BCB]/30 shadow-md bg-purple-100">
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/A_P_J_Abdul_Kalam.jpg/400px-A_P_J_Abdul_Kalam.jpg"
                alt="Dr. A.P.J. Abdul Kalam"
                width={52}
                height={52}
                className="w-full h-full object-cover object-top"
                unoptimized
              />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#2D1B69] mb-0.5 uppercase tracking-wide">
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

import type { Quote } from "@/data/quotes";

interface QuoteCardProps {
  quote: Quote | null;
}

/**
 * QuoteCard — displays the daily quote in a premium white card.
 * Accepts `null` while the quote is loading (shows a skeleton).
 * Designed to be independent so it can later receive data from any source.
 */
export default function QuoteCard({ quote }: QuoteCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-7 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-purple-50 flex flex-col justify-between h-full">
      {/* Label */}
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6D4BCB] mb-4">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="opacity-70">
          <path d="M4 0L5.09 2.91L8 4L5.09 5.09L4 8L2.91 5.09L0 4L2.91 2.91L4 0Z" />
        </svg>
        Quote of the Day
      </span>

      {quote ? (
        <>
          {/* Opening quotation mark */}
          <div
            className="text-[64px] leading-none text-[#6D4BCB] opacity-15 font-serif select-none -mb-4"
            aria-hidden
          >
            &ldquo;
          </div>

          {/* Quote text */}
          <blockquote className="text-[15px] md:text-[17px] text-gray-700 italic leading-relaxed mb-4 flex-1">
            {quote.text}
          </blockquote>

          {/* Author */}
          <p className="text-sm font-bold text-[#2D1B69] mt-2">
            — {quote.author || "Anonymous"}
          </p>
        </>
      ) : (
        // Loading skeleton
        <div className="space-y-3 flex-1">
          <div className="h-4 bg-purple-100 rounded-full animate-pulse w-full" />
          <div className="h-4 bg-purple-100 rounded-full animate-pulse w-11/12" />
          <div className="h-4 bg-purple-100 rounded-full animate-pulse w-4/5" />
          <div className="h-3 bg-purple-100 rounded-full animate-pulse w-1/3 mt-3" />
        </div>
      )}
    </div>
  );
}

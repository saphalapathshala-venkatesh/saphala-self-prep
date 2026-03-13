import type { Quote } from "@/data/quotes";

interface QuoteCardProps {
  quote: Quote | null;
}

/**
 * QuoteCard — compact premium card with brand purple left-accent.
 * Accepts `null` while loading (shows skeleton).
 */
export default function QuoteCard({ quote }: QuoteCardProps) {
  return (
    <div
      className="bg-[#F6F2FF] rounded-xl shadow-sm flex flex-col justify-between h-full px-5 py-4"
      style={{ border: "1px solid #E9E0FF", borderLeft: "4px solid #8050C0" }}
    >
      {/* Label */}
      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8050C0] mb-2">
        <svg width="6" height="6" viewBox="0 0 8 8" fill="currentColor" className="opacity-80">
          <path d="M4 0L5.09 2.91L8 4L5.09 5.09L4 8L2.91 5.09L0 4L2.91 2.91L4 0Z" />
        </svg>
        Quote of the Day
      </span>

      {quote ? (
        <>
          {/* Quote text */}
          <blockquote className="text-[14px] md:text-[15px] text-[#0F172A] italic leading-relaxed mb-3 flex-1">
            &ldquo;{quote.text}&rdquo;
          </blockquote>

          {/* Author */}
          <p className="text-[12px] font-bold text-[#2D1B69]">
            — {quote.author || "Anonymous"}
          </p>
        </>
      ) : (
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-purple-200/60 rounded-full animate-pulse w-full" />
          <div className="h-3 bg-purple-200/60 rounded-full animate-pulse w-11/12" />
          <div className="h-3 bg-purple-200/60 rounded-full animate-pulse w-4/5" />
          <div className="h-2.5 bg-purple-200/60 rounded-full animate-pulse w-1/3 mt-2" />
        </div>
      )}
    </div>
  );
}

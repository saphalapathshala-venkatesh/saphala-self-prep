import type { ReactNode } from "react";
import BrandFooter from "@/components/learn/BrandFooter";

interface EbookPageShellProps {
  title: string;
  subject: string | null;
  breadcrumbParts: string[];
  subjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
  body: ReactNode;
}

const BRAND_PURPLE = "#6D4BCB";
const BRAND_DARK = "#2D1B69";

export default function EbookPageShell({
  title,
  subject,
  breadcrumbParts,
  subjectColor,
  xpEnabled,
  xpValue,
  body,
}: EbookPageShellProps) {
  const accentColor = subjectColor ?? BRAND_PURPLE;
  const showXp = xpEnabled && xpValue > 0;

  return (
    <article
      className="bg-white rounded-2xl shadow-[0_6px_32px_rgba(0,0,0,0.13)] overflow-hidden"
      style={{
        border: `3px solid ${accentColor}`,
        position: "relative",
      }}
    >
      {/* ── Watermark ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <img
          src="/images/saphala-logo.png"
          alt=""
          draggable={false}
          style={{
            width: "55%",
            maxWidth: 380,
            opacity: 0.06,
            filter: "grayscale(100%)",
            transform: "rotate(-15deg)",
            userSelect: "none",
          }}
        />
      </div>

      {/* ── All visible content sits above watermark ── */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Subject + XP strip — identical pattern to FlashCard CardShell ── */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-3 shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-white text-[11px] font-bold uppercase tracking-widest truncate leading-tight">
              {subject || "Ebook"}
            </p>
            {showXp && (
              <p className="text-white/70 text-[9px] mt-0.5 leading-tight">
                Complete to earn {xpValue} XP
              </p>
            )}
          </div>
          {showXp && (
            <span className="ml-3 shrink-0 inline-flex items-center gap-1 bg-white/25 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              ⚡ {xpValue} XP
            </span>
          )}
        </div>

        {/* ── Title gradient header ── */}
        <div
          className="px-8 py-8"
          style={{
            background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${accentColor} 100%)`,
          }}
        >
          {breadcrumbParts.length > 0 && (
            <p className="text-purple-300 text-xs mb-2 truncate">
              {breadcrumbParts.join(" › ")}
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">
            {title}
          </h1>
        </div>

        {/* ── Body ── */}
        <div
          className="
            prose prose-sm md:prose-base max-w-none px-8 py-8
            prose-headings:font-bold
            prose-a:no-underline hover:prose-a:underline
            prose-code:px-1 prose-code:rounded
            prose-pre:bg-gray-900 prose-pre:text-gray-100
          "
          style={
            {
              "--tw-prose-headings": BRAND_DARK,
              "--tw-prose-links": accentColor,
              "--tw-prose-bold": BRAND_DARK,
              "--tw-prose-code": accentColor,
              "--tw-prose-code-bg": "#f5f3ff",
              "--tw-prose-quote-borders": accentColor,
            } as React.CSSProperties
          }
        >
          {body}
        </div>
      </div>

      {/* ── Footer ── */}
      <BrandFooter style={{ position: "relative", zIndex: 1 }} />
    </article>
  );
}

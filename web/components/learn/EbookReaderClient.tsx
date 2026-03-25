"use client";

import { useState, useRef } from "react";
import EbookPageShell from "@/components/learn/EbookPageShell";
import XpEarnedBadge from "@/components/shared/XpEarnedBadge";
import { triggerXpCelebration } from "@/lib/xpCelebration";

const PURPLE = "#6D4BCB";
const GREEN = "#10B981";

function ProgressBar({
  current,
  total,
  color,
}: {
  current: number;
  total: number;
  color: string;
}) {
  const pct = total > 1 ? Math.round(((current + 1) / total) * 100) : 100;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          Reading Progress
        </span>
        <span className="text-xs font-bold" style={{ color }}>
          Page {current + 1} / {total}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface Chapter {
  id: string;
  title: string | null;
  contentHtml: string;
}

interface EbookReaderClientProps {
  lessonId: string;
  title: string;
  subject: string | null;
  breadcrumbParts: string[];
  subjectColor: string | null;
  xpEnabled: boolean;
  xpValue: number;
  chapters: Chapter[];
  backHref?: string;
  backLabel?: string;
}

type XpStatus = "idle" | "loading" | "earned" | "already_earned" | "none";

export default function EbookReaderClient({
  lessonId,
  title,
  subject,
  breadcrumbParts,
  subjectColor,
  xpEnabled,
  xpValue,
  chapters,
  backHref = "/learn/lessons",
  backLabel = "← Back to Ebooks",
}: EbookReaderClientProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [xpStatus, setXpStatus] = useState<XpStatus>("idle");
  const [xpAwarded, setXpAwarded] = useState(0);
  const [xpMultiplier, setXpMultiplier] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const totalPages = chapters.length;
  const isFirst = currentPage === 0;
  const isLast = currentPage === totalPages - 1;
  const chapter = chapters[currentPage];
  const isFinished =
    xpStatus === "earned" ||
    xpStatus === "already_earned" ||
    xpStatus === "none";

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goNext() {
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    scrollToTop();
  }

  function goPrev() {
    setCurrentPage((p) => Math.max(p - 1, 0));
    scrollToTop();
  }

  async function handleFinish() {
    if (xpStatus !== "idle") return;
    setXpStatus("loading");
    try {
      const res = await fetch("/api/student/ebooks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const awarded: number = data.xpAwarded ?? 0;
      const mult: number = data.xpMultiplier ?? 0;
      setXpAwarded(awarded);
      setXpMultiplier(mult);
      if (awarded > 0) {
        setXpStatus("earned");
        triggerXpCelebration();
      } else if (data.completionNumber >= 3) {
        setXpStatus("already_earned");
        triggerXpCelebration();
      } else {
        setXpStatus("none");
      }
    } catch {
      setXpStatus("none");
    }
  }

  const body = (
    <div>
      {chapter.title && (
        <h2
          className="text-xl font-bold mb-5"
          style={{ color: "#2D1B69" }}
        >
          {chapter.title}
        </h2>
      )}
      {chapter.contentHtml ? (
        <div dangerouslySetInnerHTML={{ __html: chapter.contentHtml }} />
      ) : (
        <p className="text-gray-400 italic text-sm">
          No content available for this chapter yet.
        </p>
      )}
    </div>
  );

  const accentColor = subjectColor ?? PURPLE;

  return (
    <div ref={topRef}>
      {/* Progress bar — always shown, uses subject color */}
      <ProgressBar current={currentPage} total={totalPages} color={accentColor} />

      <EbookPageShell
        title={title}
        subject={subject}
        breadcrumbParts={breadcrumbParts}
        subjectColor={subjectColor}
        xpEnabled={xpEnabled}
        xpValue={xpValue}
        body={body}
      />

      {/* XP result banner — shown after Finish */}
      {xpStatus === "earned" && xpAwarded > 0 && (
        <div className="mt-4">
          <XpEarnedBadge
            xp={xpAwarded}
            label={
              xpMultiplier < 1
                ? `Lesson Complete! (${Math.round(xpMultiplier * 100)}% XP — 2nd read)`
                : "Lesson Complete! XP Earned!"
            }
          />
        </div>
      )}
      {xpStatus === "already_earned" && (
        <div className="mt-4 flex flex-col gap-3">
          {/* Card 1 — No XP notice */}
          <div className="rounded-xl px-4 py-4 flex items-start gap-3" style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}>
            <span className="text-2xl leading-none mt-0.5">🏆</span>
            <div>
              <p className="text-sm font-bold text-orange-800 mb-1">No Sadhana Points for this read</p>
              <p className="text-xs text-orange-700 leading-relaxed">
                From the 3rd read or attempt onwards, Sadhana Points (XP) will not be allocated for revisiting this lesson. You've already earned the maximum XP for this content.
              </p>
            </div>
          </div>

          {/* Card 2 — Motivational */}
          <div className="rounded-xl px-4 py-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #2D1B69 0%, #6D4BCB 100%)", border: "none" }}>
            <span className="text-2xl leading-none mt-0.5">🌟</span>
            <div>
              <p className="text-sm font-bold text-white mb-1">Keep up the good effort!</p>
              <p className="text-xs text-purple-200 leading-relaxed">
                With every effort you are moving closer to your dream job. Consistent revision is what separates toppers from the rest — keep going!
              </p>
            </div>
          </div>
        </div>
      )}
      {xpStatus === "none" && !xpEnabled && (
        <div className="mt-4 rounded-xl px-4 py-3 text-sm text-gray-500 bg-gray-50 border border-gray-200">
          ✓ Lesson complete!
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-3 mb-3 flex justify-between items-center gap-3">
        {/* Left button */}
        {isFirst || isLast ? (
          <a
            href={backHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: GREEN }}
          >
            {backLabel}
          </a>
        ) : (
          <button
            onClick={goPrev}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: GREEN }}
          >
            ← Previous Page
          </button>
        )}

        {/* Right button */}
        {isLast ? (
          <button
            onClick={handleFinish}
            disabled={xpStatus === "loading" || isFinished}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: PURPLE }}
          >
            {xpStatus === "loading"
              ? "Finishing…"
              : isFinished
              ? "✓ Completed"
              : "Finish ✓"}
          </button>
        ) : (
          <button
            onClick={goNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: PURPLE }}
          >
            Next Page →
          </button>
        )}
      </div>
    </div>
  );
}

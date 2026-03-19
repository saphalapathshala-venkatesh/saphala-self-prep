"use client";

import { useState } from "react";
import Link from "next/link";
import type { SectionRow, LessonItemRow } from "@/lib/courseDb";
import { itemUrl, itemIcon } from "@/lib/courseDb";
import { colorTokens } from "@/lib/subjectColor";

function isLocked(item: LessonItemRow): boolean {
  return !!item.unlockAt && new Date(item.unlockAt) > new Date();
}

function ItemTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    HTML_PAGE: "E-Book",
    PDF: "PDF",
    FLASHCARD_DECK: "Flashcards",
    VIDEO: "Video",
    EXTERNAL_LINK: "Link",
  };
  const colors: Record<string, string> = {
    HTML_PAGE: "bg-purple-50 text-purple-700",
    PDF: "bg-red-50 text-red-700",
    FLASHCARD_DECK: "bg-yellow-50 text-yellow-700",
    VIDEO: "bg-blue-50 text-blue-700",
    EXTERNAL_LINK: "bg-gray-50 text-gray-600",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[type] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function LessonItemRow_({ item }: { item: LessonItemRow }) {
  const locked = isLocked(item);
  const url = itemUrl(item);
  const icon = itemIcon(item.itemType);

  const content = (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
      locked
        ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
        : url
        ? "border-gray-100 bg-white hover:border-[#6D4BCB] hover:shadow-sm cursor-pointer"
        : "border-gray-100 bg-gray-50 cursor-default"
    }`}>
      <span className="text-base flex-shrink-0">{locked ? "🔒" : icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2D1B69] leading-snug line-clamp-1">
          {item.titleSnapshot}
        </p>
        {locked && item.unlockAt && (
          <p className="text-[10px] text-amber-600 mt-0.5">
            Unlocks {new Date(item.unlockAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
      <ItemTypeLabel type={item.itemType} />
      {!locked && url && (
        <svg className="w-4 h-4 text-[#6D4BCB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (!locked && url) {
    return <Link href={url}>{content}</Link>;
  }
  return <div>{content}</div>;
}

function ChapterBlock({ chapter }: { chapter: { chapterId: string; title: string; lessons: { lessonId: string; title: string; items: LessonItemRow[] }[] } }) {
  const [open, setOpen] = useState(true);
  const totalItems = chapter.lessons.reduce((n, l) => n + l.items.length, 0);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-[#2D1B69] flex-1">{chapter.title}</span>
        <span className="text-[10px] text-gray-400">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2 bg-white">
          {chapter.lessons.map((lesson) => (
            <div key={lesson.lessonId}>
              {/* Lesson label if more than 1 lesson in chapter */}
              {chapter.lessons.length > 1 && (
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 mt-1">
                  {lesson.title}
                </p>
              )}
              {lesson.items.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2 py-1">No items yet</p>
              ) : (
                <div className="space-y-1.5">
                  {lesson.items.map((item) => (
                    <LessonItemRow_ key={item.itemId} item={item} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {chapter.lessons.length === 0 && (
            <p className="text-xs text-gray-400 italic">No lessons yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CurriculumAccordion({ curriculum }: { curriculum: SectionRow[] }) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(curriculum.map((s) => s.sectionId))
  );

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (curriculum.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Curriculum coming soon.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {curriculum.map((section) => {
        const isOpen = openSections.has(section.sectionId);
        const totalItems = section.chapters.reduce(
          (n, ch) => n + ch.lessons.reduce((m, l) => m + l.items.length, 0),
          0
        );

        const color = colorTokens(section.subjectColor);
        return (
          <div key={section.sectionId} className="rounded-2xl border overflow-hidden" style={{ borderColor: color.border }}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.sectionId)}
              className="w-full flex items-center gap-3 px-5 py-4 transition-colors text-left"
              style={{ backgroundColor: color.bg }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color.icon}22` }}>
                <span className="text-sm">📚</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#2D1B69]">{section.subjectName}</p>
                <p className="text-[10px] text-gray-400">
                  {section.chapters.length} chapter{section.chapters.length !== 1 ? "s" : ""} · {totalItems} item{totalItems !== 1 ? "s" : ""}
                </p>
              </div>
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                style={{ color: color.icon }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Section body */}
            {isOpen && (
              <div className="px-4 py-4 bg-white">
                {section.chapters.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">No chapters yet</p>
                ) : (
                  section.chapters.map((ch) => (
                    <ChapterBlock key={ch.chapterId} chapter={ch} />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

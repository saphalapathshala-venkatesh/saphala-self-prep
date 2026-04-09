"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SectionRow, LessonItemRow } from "@/lib/courseDb";
import { itemUrl } from "@/lib/courseDb";
import { colorTokens } from "@/lib/subjectColor";
import type { CourseContext } from "@/lib/courseNav";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function nowIST(): Date { return new Date(Date.now() + IST_OFFSET_MS); }

function isLocked(item: LessonItemRow): boolean {
  return !!item.unlockAt && new Date(item.unlockAt) > nowIST();
}

// ── Product-type badge with icon ──────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  const cls = "w-3 h-3 flex-shrink-0";
  switch (type) {
    case "HTML_PAGE":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "PDF":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "FLASHCARD_DECK":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case "VIDEO":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "EXTERNAL_LINK":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      );
    case "QUIZ":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}

const TYPE_META: Record<string, { label: string; pill: string }> = {
  HTML_PAGE:      { label: "E-Book",      pill: "bg-purple-50 text-purple-700 ring-purple-200"  },
  PDF:            { label: "PDF",          pill: "bg-red-50 text-red-700 ring-red-200"           },
  FLASHCARD_DECK: { label: "Flashcards",   pill: "bg-yellow-50 text-yellow-700 ring-yellow-200"  },
  VIDEO:          { label: "Video",        pill: "bg-blue-50 text-blue-700 ring-blue-200"        },
  EXTERNAL_LINK:  { label: "Link",         pill: "bg-gray-50 text-gray-600 ring-gray-200"        },
  QUIZ:           { label: "Test",         pill: "bg-green-50 text-green-700 ring-green-200"     },
};

function ItemTypeLabel({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? { label: type, pill: "bg-gray-100 text-gray-500 ring-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${meta.pill}`}>
      <TypeIcon type={type} />
      {meta.label}
    </span>
  );
}

// ── Subject folder book icon ──────────────────────────────────────────────────

function SubjectBookIcon({ color }: { color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}20` }}
    >
      <svg className="w-4 h-4" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>
  );
}

// ── Lesson item row ───────────────────────────────────────────────────────────

function LessonItemRow_({
  item,
  entitlementLocked,
  courseId,
  lessonId,
}: {
  item: LessonItemRow;
  entitlementLocked: boolean;
  courseId: string;
  lessonId: string;
}) {
  const timeLocked = isLocked(item);
  const effectiveLocked = timeLocked || entitlementLocked;
  const ctx: CourseContext = { courseId, lessonId, itemId: item.itemId };
  const url = itemUrl(item, ctx);

  const content = (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
      timeLocked
        ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
        : entitlementLocked
        ? "border-gray-100 bg-gray-50/70 cursor-default opacity-75"
        : url
        ? "border-gray-100 bg-white hover:border-[#6D4BCB] hover:shadow-sm cursor-pointer"
        : "border-gray-100 bg-gray-50 cursor-default"
    }`}>
      {effectiveLocked ? (
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : (
        <div className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0">
          <TypeIcon type={item.itemType} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug line-clamp-1 ${effectiveLocked ? "text-gray-400" : "text-[#2D1B69]"}`}>
          {item.titleSnapshot}
        </p>
        {timeLocked && item.unlockAt && (
          <p className="text-[10px] text-amber-600 mt-0.5">
            Unlocks {new Date(item.unlockAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      <ItemTypeLabel type={item.itemType} />

      {!effectiveLocked && url && (
        <svg className="w-4 h-4 text-[#6D4BCB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (!effectiveLocked && url) {
    return <Link href={url}>{content}</Link>;
  }
  return <div>{content}</div>;
}

// ── Chapter block ─────────────────────────────────────────────────────────────

function ChapterBlock({ chapter, entitlementLocked, courseId, highlightLessonId }: {
  chapter: { chapterId: string; title: string; lessons: { lessonId: string; title: string; items: LessonItemRow[] }[] };
  entitlementLocked: boolean;
  courseId: string;
  highlightLessonId?: string;
}) {
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
          {chapter.lessons.map((lesson) => {
            const isHighlighted = highlightLessonId === lesson.lessonId;
            return (
              <div
                key={lesson.lessonId}
                data-lesson-id={lesson.lessonId}
                className={`rounded-xl transition-all duration-700 ${
                  isHighlighted ? "ring-2 ring-[#6D4BCB]/40 ring-offset-1 bg-purple-50/40" : ""
                }`}
              >
                {chapter.lessons.length > 1 && (
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 mt-1 px-1">
                    {lesson.title}
                  </p>
                )}
                {lesson.items.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-2 py-1">No items yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {lesson.items.map((item) => (
                      <LessonItemRow_
                        key={item.itemId}
                        item={item}
                        entitlementLocked={entitlementLocked}
                        courseId={courseId}
                        lessonId={lesson.lessonId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {chapter.lessons.length === 0 && (
            <p className="text-xs text-gray-400 italic">No lessons yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main accordion ────────────────────────────────────────────────────────────

export function CurriculumAccordion({
  curriculum,
  entitlementLocked = false,
  courseId,
  initialLessonId,
}: {
  curriculum: SectionRow[];
  entitlementLocked?: boolean;
  courseId: string;
  initialLessonId?: string;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(curriculum.map((s) => s.sectionId))
  );
  const [highlightLessonId, setHighlightLessonId] = useState<string | undefined>(initialLessonId);

  // Scroll to and briefly highlight the target lesson after mount
  useEffect(() => {
    if (!initialLessonId) return;
    const el = document.querySelector<HTMLElement>(`[data-lesson-id="${CSS.escape(initialLessonId)}"]`);
    if (!el) return;
    // Delay slightly to ensure layout is complete before scrolling
    const scrollTimer = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    // Fade the highlight out after 1.8 s
    const fadeTimer = setTimeout(() => setHighlightLessonId(undefined), 1800);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(fadeTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <div key={section.sectionId} className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.sectionId)}
              className="w-full flex items-center gap-0 text-left hover:bg-gray-50 transition-colors"
            >
              {/* Left colored accent bar — matches admin pattern */}
              <div
                className="w-1 self-stretch flex-shrink-0"
                style={{ backgroundColor: color.icon }}
              />

              {/* Header content */}
              <div className="flex items-center gap-3 px-4 py-4 flex-1 min-w-0">
                <SubjectBookIcon color={color.icon} />

                <div className="flex-1 min-w-0">
                  {/* Subject name in the subject's own color */}
                  <p className="text-sm font-bold leading-snug" style={{ color: color.icon }}>
                    {section.subjectName}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
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
              </div>
            </button>

            {/* Section body */}
            {isOpen && (
              <div className="px-4 py-4 bg-gray-50/40 border-t border-gray-100">
                {section.chapters.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">No chapters yet</p>
                ) : (
                  section.chapters.map((ch) => (
                    <ChapterBlock
                      key={ch.chapterId}
                      chapter={ch}
                      entitlementLocked={entitlementLocked}
                      courseId={courseId}
                      highlightLessonId={highlightLessonId}
                    />
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

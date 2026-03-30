"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { CourseListItem, ExamItem } from "@/lib/courseDb";
import { getCategoryImage } from "@/config/categoryImages";

// ── Static metadata ────────────────────────────────────────────────────────────

const PRODUCT_META: Record<string, { label: string; badge: string; badgeColor: string; emptyMsg: string }> = {
  FREE_DEMO:          { label: "Free Demo Courses & Tests", badge: "Free Demo",       badgeColor: "bg-green-100 text-green-800",   emptyMsg: "No free demo courses are available yet. Check back soon — new free content is added regularly." },
  COMPLETE_PREP_PACK: { label: "Complete Prep Packs",       badge: "Complete Pack",   badgeColor: "bg-purple-100 text-purple-800", emptyMsg: "Complete Prep Packs are coming soon. These bundles include everything you need — videos, PDFs, tests, and flashcards." },
  VIDEO_ONLY:         { label: "Video Courses",             badge: "Video Course",    badgeColor: "bg-blue-100 text-blue-800",     emptyMsg: "Video courses are being recorded by our faculty. Check back soon for structured, topic-wise lessons." },
  SELF_PREP:          { label: "Self Prep Courses",         badge: "Self Prep",       badgeColor: "bg-indigo-100 text-indigo-800", emptyMsg: "Self Prep courses are on their way. These give you a guided learning path with mixed study material." },
  PDF_ONLY:           { label: "PDF Study Material",        badge: "PDF Notes",       badgeColor: "bg-red-100 text-red-800",       emptyMsg: "PDF study material courses are coming soon. Focused, exam-oriented notes for reading and revision." },
  TEST_SERIES:        { label: "Test Series",               badge: "Test Series",     badgeColor: "bg-amber-100 text-amber-800",   emptyMsg: "Test series courses are being prepared. Full mock exams and topic-wise practice tests will appear here." },
  FLASHCARDS_ONLY:    { label: "Flashcard Courses",         badge: "Flashcards",      badgeColor: "bg-yellow-100 text-yellow-800", emptyMsg: "Flashcard courses are coming soon. Daily recall cards built to help you revise key concepts fast." },
  CURRENT_AFFAIRS:    { label: "Current Affairs",           badge: "Current Affairs", badgeColor: "bg-teal-100 text-teal-800",     emptyMsg: "Current Affairs courses are being put together. Daily digests and quiz-based revision will appear here." },
};

const PRODUCT_OPTIONS = [
  { value: "",                   label: "All Course Types" },
  { value: "FREE_DEMO",          label: "Free Demo Courses & Tests" },
  { value: "TEST_SERIES",        label: "Test Series" },
  { value: "COMPLETE_PREP_PACK", label: "Complete Prep Packs" },
  { value: "VIDEO_ONLY",         label: "Video Courses" },
  { value: "SELF_PREP",          label: "Self Prep Courses" },
  { value: "PDF_ONLY",           label: "PDF Study Material" },
  { value: "FLASHCARDS_ONLY",    label: "Flashcard Decks" },
  { value: "CURRENT_AFFAIRS",    label: "Current Affairs" },
];

function formatRupeesINR(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function formatValidity(
  type: string | null,
  days: number | null,
  months: number | null,
): string | null {
  if (!type) return null;
  if (type === "lifetime") return "Lifetime access";
  if (type === "days" && days) {
    if (days % 365 === 0) {
      const y = days / 365;
      return `${y} Year${y > 1 ? "s" : ""} access`;
    }
    if (days % 30 === 0) {
      const m = days / 30;
      return `${m} Month${m > 1 ? "s" : ""} access`;
    }
    return `${days} Days access`;
  }
  if (type === "months" && months) {
    return `${months} Month${months > 1 ? "s" : ""} access`;
  }
  return null;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface CategoryMeta {
  id: string;
  name: string;
}

export interface CategoryExams {
  categoryId: string;
  exams: ExamItem[];
}

interface Props {
  allCourses: CourseListItem[];
  categories: CategoryMeta[];
  examsByCategory: CategoryExams[];
  initialCategory: string | null;
  initialExam: string | null;
  initialProductCategory: string | null;
  enrolledCourseIds?: string[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CoursesClient({
  allCourses,
  categories,
  examsByCategory,
  initialCategory,
  initialExam,
  initialProductCategory,
  enrolledCourseIds = [],
}: Props) {
  const enrolledSet = useMemo(() => new Set(enrolledCourseIds), [enrolledCourseIds]);
  const router = useRouter();

  const [activeCategory,        setActiveCategory]        = useState<string | null>(initialCategory);
  const [activeExam,            setActiveExam]            = useState<string | null>(initialExam);
  const [activeProductCategory, setActiveProductCategory] = useState<string | null>(initialProductCategory);

  // ── Derived data ──────────────────────────────────────────────────────────

  const exams: ExamItem[] = useMemo(() => {
    if (!activeCategory) return [];
    return examsByCategory.find((e) => e.categoryId === activeCategory)?.exams ?? [];
  }, [activeCategory, examsByCategory]);

  const filteredCourses: CourseListItem[] = useMemo(() => {
    return allCourses.filter((c) => {
      if (activeCategory        && c.categoryId        !== activeCategory)        return false;
      if (activeExam            && c.examId            !== activeExam)            return false;
      if (activeProductCategory && c.productCategory   !== activeProductCategory) return false;
      return true;
    });
  }, [allCourses, activeCategory, activeExam, activeProductCategory]);

  const activeCatObj  = categories.find((c) => c.id === activeCategory) ?? null;
  const activeExamObj = exams.find((e) => e.id === activeExam) ?? null;
  const productMeta   = activeProductCategory ? PRODUCT_META[activeProductCategory] : null;
  const catImage      = activeCategory ? getCategoryImage(activeCategory) : null;

  // ── URL sync helper — keeps URL shareable without a server round-trip ──────

  function pushUrl(cat: string | null, exam: string | null, prod: string | null) {
    const p = new URLSearchParams();
    if (prod) p.set("productCategory", prod);
    if (cat)  p.set("category", cat);
    if (exam) p.set("exam", exam);
    const qs = p.toString();
    router.replace(qs ? `/courses?${qs}` : "/courses", { scroll: false });
  }

  // ── Filter handlers — instant, no server round-trip ───────────────────────

  function selectCategory(catId: string | null) {
    setActiveCategory(catId);
    setActiveExam(null); // reset exam when category changes
    pushUrl(catId, null, activeProductCategory);
  }

  function selectExam(examId: string | null) {
    setActiveExam(examId);
    pushUrl(activeCategory, examId, activeProductCategory);
  }

  function selectProductCategory(prod: string) {
    const val = prod || null;
    setActiveProductCategory(val);
    pushUrl(activeCategory, activeExam, val);
  }

  function clearProductCategory() {
    setActiveProductCategory(null);
    pushUrl(activeCategory, activeExam, null);
  }

  // ── Hero text ─────────────────────────────────────────────────────────────

  let heroTitle = "Course Catalog";
  if (activeExamObj)                 heroTitle = `${activeExamObj.name} Courses`;
  else if (activeCatObj && productMeta) heroTitle = `${activeCatObj.name} — ${productMeta.label}`;
  else if (activeCatObj)             heroTitle = `${activeCatObj.name} Courses`;
  else if (productMeta)              heroTitle = productMeta.label;

  const heroSub =
    activeExamObj
      ? `All courses for ${activeExamObj.name}${activeCatObj ? ` · ${activeCatObj.name}` : ""}`
      : activeCatObj && productMeta
      ? `${productMeta.label} courses for ${activeCatObj.name} exam preparation`
      : activeCatObj
      ? `All courses for ${activeCatObj.name} exam preparation`
      : productMeta
      ? "Browse all available courses in this category"
      : "Pick your exam, choose your course, and start preparing today.";

  // ── Empty state ───────────────────────────────────────────────────────────

  let emptyTitle = "No courses available yet";
  let emptyBody  = productMeta?.emptyMsg ?? "New courses are being added. Check back soon.";
  if (activeExamObj) {
    emptyTitle = `No courses for ${activeExamObj.name} yet`;
    emptyBody  = "Courses for this exam are being prepared. Check back soon.";
  } else if (activeCatObj && !productMeta) {
    emptyTitle = `No courses available for ${activeCatObj.name} yet`;
    emptyBody  = "New courses are being added. Check back soon.";
  } else if (activeCatObj && productMeta) {
    emptyTitle = `No ${productMeta.label} for ${activeCatObj.name} yet`;
  }

  const emptyEmoji =
    activeProductCategory === "FREE_DEMO"          ? "🎁"
    : activeProductCategory === "VIDEO_ONLY"       ? "🎬"
    : activeProductCategory === "FLASHCARDS_ONLY"  ? "🃏"
    : activeProductCategory === "TEST_SERIES"      ? "✏️"
    : activeProductCategory === "CURRENT_AFFAIRS"  ? "📰"
    : "📚";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-purple-300 text-xs mb-3">
            <button
              onClick={() => selectCategory(null)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              All Courses
            </button>
            {activeCatObj && (
              <>
                <span>/</span>
                <button
                  onClick={() => selectExam(null)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {activeCatObj.name}
                </button>
              </>
            )}
            {activeExamObj && (
              <>
                <span>/</span>
                <span className="text-purple-200">{activeExamObj.name}</span>
              </>
            )}
            {!activeCatObj && productMeta && (
              <>
                <span>/</span>
                <span className="text-purple-200">{productMeta.label}</span>
              </>
            )}
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{heroTitle}</h1>
          <p className="text-purple-200 text-sm max-w-xl">{heroSub}</p>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-2.5 min-w-max">
            <button
              onClick={() => selectCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                !activeCategory
                  ? "bg-[#6D4BCB] text-white shadow-sm"
                  : "text-gray-600 hover:bg-purple-50 hover:text-[#6D4BCB]"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  cat.id === activeCategory
                    ? "bg-[#6D4BCB] text-white shadow-sm"
                    : "text-gray-600 hover:bg-purple-50 hover:text-[#6D4BCB]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product category dropdown ── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
            Course Type
          </label>
          <div className="w-full sm:max-w-xs relative">
            <select
              value={activeProductCategory ?? ""}
              onChange={(e) => selectProductCategory(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-[#2D1B69] focus:outline-none focus:ring-2 focus:ring-[#6D4BCB] focus:border-[#6D4BCB] cursor-pointer transition-colors hover:border-[#6D4BCB]/50 shadow-sm"
            >
              {PRODUCT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
          {activeProductCategory && productMeta && (
            <button
              onClick={clearProductCategory}
              className="text-xs text-gray-400 hover:text-[#6D4BCB] transition-colors flex items-center gap-1 shrink-0"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ── Exam filter pills (only when a category is selected and exams exist) ── */}
      {activeCategory && exams.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
            <div className="flex items-center gap-2 py-2.5 min-w-max">
              <span className="text-xs font-semibold text-gray-400 mr-1 shrink-0">Exam:</span>
              <button
                onClick={() => selectExam(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  !activeExam
                    ? "bg-[#2D1B69] text-white border-[#2D1B69]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#6D4BCB] hover:text-[#6D4BCB]"
                }`}
              >
                All {activeCatObj?.name} Exams
              </button>
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => selectExam(exam.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    exam.id === activeExam
                      ? "bg-[#2D1B69] text-white border-[#2D1B69]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#6D4BCB] hover:text-[#6D4BCB]"
                  }`}
                >
                  {exam.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Category banner image ── */}
      {catImage && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-sm">
            <Image
              src={catImage}
              alt={activeCatObj?.name ?? "Category"}
              width={1200}
              height={400}
              className="w-full object-cover max-h-56 sm:max-h-72"
              priority
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">{emptyEmoji}</div>
            <p className="text-gray-700 font-semibold text-base mb-2">{emptyTitle}</p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{emptyBody}</p>
            <button
              onClick={() => { setActiveCategory(null); setActiveExam(null); setActiveProductCategory(null); pushUrl(null, null, null); }}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#6D4BCB] text-white px-5 py-2.5 rounded-xl hover:bg-[#5C3DB5] transition-colors"
            >
              ← Browse All Courses
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
              {activeCatObj  ? ` · ${activeCatObj.name}`  : ""}
              {activeExamObj ? ` › ${activeExamObj.name}` : ""}
              {productMeta   ? ` · ${productMeta.label}`  : ""}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const meta         = PRODUCT_META[course.productCategory];
                const isFreeCourse = course.isFree || course.productCategory === "FREE_DEMO";
                const hasPricing   = !isFreeCourse && course.sellingPrice != null && course.sellingPrice > 0;
                const isEnrolled   = enrolledSet.has(course.id);

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden ${
                      isEnrolled
                        ? "border-emerald-200 border-l-4 border-l-emerald-500"
                        : isFreeCourse
                        ? "border-green-200 border-l-4 border-l-green-400"
                        : "border-gray-100 border-l-4 border-l-[#6D4BCB]"
                    }`}
                  >
                    {course.thumbnailUrl ? (
                      <div className="aspect-video overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={course.thumbnailUrl}
                          alt={course.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className={`aspect-video flex items-center justify-center px-4 ${
                        isFreeCourse
                          ? "bg-gradient-to-br from-green-700 to-green-500"
                          : "bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB]"
                      }`}>
                        <span className="text-white font-bold text-sm text-center line-clamp-3">
                          {course.name}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex flex-col flex-1 gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {isEnrolled && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Enrolled
                          </span>
                        )}
                        {isFreeCourse ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                            FREE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Premium
                          </span>
                        )}
                        {meta && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                            {meta.badge}
                          </span>
                        )}
                        {course.examName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            {course.examName}
                          </span>
                        )}
                        {course.categoryName && !course.examName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {course.categoryName}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#2D1B69] leading-snug group-hover:text-[#6D4BCB] transition-colors">
                        {course.name}
                      </h3>

                      {course.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                          {course.description}
                        </p>
                      )}

                      {hasPricing && (
                        <div className="mt-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-bold text-[#2D1B69]">
                              {formatRupeesINR(course.sellingPrice!)}
                            </span>
                            {course.mrp != null && course.mrp > course.sellingPrice! && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatRupeesINR(course.mrp)}
                              </span>
                            )}
                            {course.discountPercent != null && course.discountPercent > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                {course.discountPercent}% off
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Validity badge — shown for all premium (non-free) courses */}
                      {!isFreeCourse && (() => {
                        const validityLabel = formatValidity(
                          course.validityType,
                          course.validityDays,
                          course.validityMonths,
                        );
                        return validityLabel ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 w-fit">
                            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[11px] font-semibold text-amber-700">{validityLabel}</span>
                          </div>
                        ) : null;
                      })()}

                      <div className="flex gap-2 flex-wrap mt-1">
                        {course.hasVideoCourse    && <span className="text-[10px] text-gray-400">🎬 Videos</span>}
                        {course.hasHtmlCourse     && <span className="text-[10px] text-gray-400">📖 Ebooks</span>}
                        {course.hasPdfCourse      && <span className="text-[10px] text-gray-400">📄 PDFs</span>}
                        {course.hasTestSeries     && <span className="text-[10px] text-gray-400">✏️ Tests</span>}
                        {course.hasFlashcardDecks && <span className="text-[10px] text-gray-400">🃏 Flashcards</span>}
                      </div>

                      <span
                        className={`mt-2 block w-full text-center text-xs font-bold py-2 rounded-xl transition-colors ${
                          isEnrolled
                            ? "bg-emerald-600 text-white group-hover:bg-emerald-700"
                            : isFreeCourse
                            ? "bg-green-600 text-white group-hover:bg-green-700"
                            : "bg-[#6D4BCB] text-white group-hover:bg-[#5C3DB5]"
                        }`}
                      >
                        {isEnrolled
                          ? "Continue Learning →"
                          : isFreeCourse
                          ? "Start Free →"
                          : hasPricing
                          ? "Buy Now →"
                          : "View Course →"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { getActiveCourses } from "@/lib/courseDb";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Product category metadata ─────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function tabUrl(categoryId: string | "ALL", activeProductCategory: string | null): string {
  const params = new URLSearchParams();
  if (activeProductCategory) params.set("productCategory", activeProductCategory);
  if (categoryId !== "ALL") params.set("category", categoryId);
  const qs = params.toString();
  return qs ? `/courses?${qs}` : "/courses";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; productCategory?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory = sp.category ?? "ALL";
  const activeProductCategory = sp.productCategory ?? null;

  const [courses, categories] = await Promise.all([
    getActiveCourses({
      categoryId: activeCategory !== "ALL" ? activeCategory : undefined,
      productCategory: activeProductCategory ?? undefined,
      limit: 50,
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const productMeta = activeProductCategory ? PRODUCT_META[activeProductCategory] : null;

  // Only show tabs for categories that have at least one active course (unfiltered)
  // We fetch unfiltered counts only when no productCategory is active (simple heuristic)
  const categoryIdsWithCourses = new Set(courses.map((c) => c.categoryId).filter(Boolean));
  const tabs = [
    { id: "ALL", name: activeProductCategory ? "All" : "All Courses" },
    ...categories,
  ];

  // Active category name (for empty-state message)
  const activeCategoryName = activeCategory !== "ALL"
    ? categories.find((c) => c.id === activeCategory)?.name ?? null
    : null;

  const isFreeDemo = (productCategory: string) => productCategory === "FREE_DEMO";

  // Hero gradient and title based on active filter
  const heroTitle = productMeta?.label ?? (activeCategoryName ? `${activeCategoryName} Courses` : "Course Catalog");
  const heroSub = productMeta
    ? "Browse all available courses in this category"
    : activeCategoryName
    ? `All courses available for ${activeCategoryName} exam preparation`
    : "Pick your exam, choose your course, and start preparing today.";

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Page Header */}
      <div className="bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-purple-300 text-xs mb-3">
            <Link href="/courses" className="hover:text-white transition-colors">All Courses</Link>
            {(productMeta || activeCategoryName) && (
              <>
                <span>/</span>
                <span className="text-purple-200">{productMeta?.label ?? activeCategoryName}</span>
              </>
            )}
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{heroTitle}</h1>
          <p className="text-purple-200 text-sm max-w-xl">{heroSub}</p>
        </div>
      </div>

      {/* Active product-category filter pill */}
      {activeProductCategory && productMeta && (
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-gray-500">Showing:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${productMeta.badgeColor}`}>
              {productMeta.label}
            </span>
            <Link
              href="/courses"
              className="text-xs text-gray-400 hover:text-[#6D4BCB] transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filter
            </Link>
          </div>
        </div>
      )}

      {/* Exam Category Tabs */}
      <div className={`border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm ${activeProductCategory ? "" : ""}`}>
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-3 min-w-max">
            {tabs.map((tab) => {
              const isActive = tab.id === activeCategory;
              const hasCourses = tab.id === "ALL" || categoryIdsWithCourses.has(tab.id);
              return (
                <Link
                  key={tab.id}
                  href={tabUrl(tab.id, activeProductCategory)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors relative ${
                    isActive
                      ? "bg-[#6D4BCB] text-white shadow-sm"
                      : "text-gray-600 hover:bg-purple-50 hover:text-[#6D4BCB]"
                  }`}
                >
                  {tab.name}
                  {tab.id !== "ALL" && !hasCourses && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gray-200" title="No courses yet" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {courses.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────────────────── */
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">
              {activeProductCategory === "FREE_DEMO" ? "🎁"
                : activeProductCategory === "VIDEO_ONLY" ? "🎬"
                : activeProductCategory === "FLASHCARDS_ONLY" ? "🃏"
                : activeProductCategory === "TEST_SERIES" ? "✏️"
                : activeProductCategory === "CURRENT_AFFAIRS" ? "📰"
                : "📚"}
            </div>
            <p className="text-gray-700 font-semibold text-base mb-2">
              {activeCategoryName && activeProductCategory
                ? `No ${productMeta?.label ?? activeProductCategory} courses for ${activeCategoryName} yet`
                : activeCategoryName
                ? `No courses available for ${activeCategoryName} yet`
                : productMeta?.label
                ? `No ${productMeta.label} yet`
                : "No courses available yet"}
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {productMeta?.emptyMsg ?? "New courses are being added. Check back soon."}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#6D4BCB] text-white px-5 py-2.5 rounded-xl hover:bg-[#5C3DB5] transition-colors"
            >
              ← Browse All Courses
            </Link>
          </div>
        ) : (
          /* ── Course grid ──────────────────────────────────────────────────── */
          <>
            <p className="text-sm text-gray-400 mb-5">
              {courses.length} course{courses.length !== 1 ? "s" : ""} found
              {activeCategoryName ? ` · ${activeCategoryName}` : ""}
              {productMeta ? ` · ${productMeta.label}` : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => {
                const meta = PRODUCT_META[course.productCategory];
                const free = isFreeDemo(course.productCategory);

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
                  >
                    {/* Thumbnail or gradient */}
                    {course.thumbnailUrl ? (
                      <div className="h-36 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={course.thumbnailUrl}
                          alt={course.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-36 bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center px-4">
                        <span className="text-white font-bold text-sm text-center line-clamp-3">
                          {course.name}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex flex-col flex-1 gap-2">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {free && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            Free
                          </span>
                        )}
                        {meta && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                            {meta.badge}
                          </span>
                        )}
                        {course.categoryName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {course.categoryName}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="text-sm font-bold text-[#2D1B69] leading-snug group-hover:text-[#6D4BCB] transition-colors">
                        {course.name}
                      </h3>

                      {/* Description */}
                      {course.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                          {course.description}
                        </p>
                      )}

                      {/* Content-type icons */}
                      <div className="flex gap-2 flex-wrap mt-1">
                        {course.hasVideoCourse    && <span className="text-[10px] text-gray-400">🎬 Videos</span>}
                        {course.hasHtmlCourse     && <span className="text-[10px] text-gray-400">📖 Ebooks</span>}
                        {course.hasPdfCourse      && <span className="text-[10px] text-gray-400">📄 PDFs</span>}
                        {course.hasTestSeries     && <span className="text-[10px] text-gray-400">✏️ Tests</span>}
                        {course.hasFlashcardDecks && <span className="text-[10px] text-gray-400">🃏 Flashcards</span>}
                      </div>

                      {/* CTA */}
                      <span className={`mt-2 block w-full text-center text-xs font-bold py-2 rounded-xl transition-colors ${
                        free
                          ? "bg-green-600 text-white group-hover:bg-green-700"
                          : "bg-[#6D4BCB] text-white group-hover:bg-[#5C3DB5]"
                      }`}>
                        {free ? "Start Free →" : "View Course →"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}

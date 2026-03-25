import { getActiveCourses } from "@/lib/courseDb";
import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { CoursesFilterBar } from "@/components/courses/CoursesFilterBar";
import { Suspense } from "react";
import { getCategoryImage } from "@/config/categoryImages";

export const dynamic = "force-dynamic";

function formatPaiseINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const PRODUCT_META: Record<string, { label: string; badge: string; badgeColor: string }> = {
  FREE_DEMO:          { label: "Free Demo",        badge: "Free Demo",       badgeColor: "bg-green-100 text-green-800"   },
  COMPLETE_PREP_PACK: { label: "Complete Pack",    badge: "Complete Pack",   badgeColor: "bg-purple-100 text-purple-800" },
  VIDEO_ONLY:         { label: "Video Course",     badge: "Video Course",    badgeColor: "bg-blue-100 text-blue-800"     },
  SELF_PREP:          { label: "Self Prep",        badge: "Self Prep",       badgeColor: "bg-indigo-100 text-indigo-800" },
  PDF_ONLY:           { label: "PDF Notes",        badge: "PDF Notes",       badgeColor: "bg-red-100 text-red-800"       },
  TEST_SERIES:        { label: "Test Series",      badge: "Test Series",     badgeColor: "bg-amber-100 text-amber-800"   },
  FLASHCARDS_ONLY:    { label: "Flashcard Decks",  badge: "Flashcards",      badgeColor: "bg-yellow-100 text-yellow-800" },
  CURRENT_AFFAIRS:    { label: "Current Affairs",  badge: "Current Affairs", badgeColor: "bg-teal-100 text-teal-800"    },
};

export default async function DashboardCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; productCategory?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory = sp.category ?? null;
  const activeProduct  = sp.productCategory ?? null;
  const hasFilters     = !!(activeCategory || activeProduct);

  const [courses, categories] = await Promise.all([
    getActiveCourses({
      categoryId:      activeCategory  ?? undefined,
      productCategory: activeProduct   ?? undefined,
      limit: hasFilters ? 60 : 6,
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeCatName      = categories.find((c) => c.id === activeCategory)?.name ?? null;
  const activeProductMeta  = activeProduct ? PRODUCT_META[activeProduct] : null;
  const activeCategoryImage = activeCategory ? getCategoryImage(activeCategory) : null;


  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">Courses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse exam preparation courses. Filter by exam category or course type to find what you need.
        </p>
      </div>

      {/* ── Explore-categories explainer card ──────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2D1B69] to-[#6D4BCB] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Explore categories to find targeted courses</p>
          <p className="text-purple-200 text-xs mt-1 leading-relaxed">
            Use the dropdowns below to filter by exam (APPSC, AP Police, TGPSC, UPSC…) and course type (Free Demo, Test Series, Flashcards…). Each category contains courses built specifically for that exam.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.slice(0, 3).map((cat) => (
            <Link
              key={cat.id}
              href={`/dashboard/courses?category=${cat.id}`}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
          {categories.length > 3 && (
            <span className="px-3 py-1.5 rounded-lg bg-white/10 text-purple-200 text-xs font-medium whitespace-nowrap">
              +{categories.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* ── Filter dropdowns ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Suspense fallback={<div className="h-12 animate-pulse bg-gray-100 rounded-xl" />}>
          <CoursesFilterBar categories={categories} />
        </Suspense>
      </div>

      {/* ── Active filter summary ──────────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Showing:</span>
          {activeCatName && (
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
              {activeCatName}
            </span>
          )}
          {activeProductMeta && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${activeProductMeta.badgeColor}`}>
              {activeProductMeta.label}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-1">
            — {courses.length} course{courses.length !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {/* ── Category banner image (if one exists for the selected category) ── */}
      {activeCategoryImage && (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm">
          <Image
            src={activeCategoryImage}
            alt={activeCatName ?? "Category"}
            width={1200}
            height={400}
            className="w-full object-cover max-h-56 sm:max-h-72"
            priority
          />
        </div>
      )}

      {/* ── Section heading ────────────────────────────────────────────────── */}
      {!hasFilters && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2D1B69] uppercase tracking-wide">
            Latest Courses
          </h2>
          <Link
            href="/courses"
            className="text-xs text-[#6D4BCB] font-semibold hover:underline"
          >
            Browse full catalog →
          </Link>
        </div>
      )}

      {/* ── Course grid / empty state ──────────────────────────────────────── */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-700 font-semibold mb-2">No courses found</p>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Try a different combination of filters, or browse all courses.
          </p>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-[#6D4BCB] text-white px-5 py-2.5 rounded-xl hover:bg-[#5C3DB5] transition-colors"
          >
            ← Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const meta = PRODUCT_META[course.productCategory];
            const isFreeCourse = course.isFree || course.productCategory === "FREE_DEMO";
            const hasPricing = !isFreeCourse && course.sellingPricePaise != null && course.sellingPricePaise > 0;

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Thumbnail — aspect-video keeps full 16:9 YouTube thumbnail visible */}
                {course.thumbnailUrl ? (
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.thumbnailUrl}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center px-4">
                    <span className="text-white font-bold text-sm text-center line-clamp-3">{course.name}</span>
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1 gap-2">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {isFreeCourse && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Free</span>
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

                  {/* Name */}
                  <h3 className="text-sm font-bold text-[#2D1B69] leading-snug group-hover:text-[#6D4BCB] transition-colors">
                    {course.name}
                  </h3>

                  {/* Description */}
                  {course.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 flex-1">{course.description}</p>
                  )}

                  {/* Price block — paid courses only */}
                  {hasPricing && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-base font-bold text-[#2D1B69]">
                        {formatPaiseINR(course.sellingPricePaise!)}
                      </span>
                      {course.mrpPaise != null && course.mrpPaise > course.sellingPricePaise! && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPaiseINR(course.mrpPaise)}
                        </span>
                      )}
                      {course.discountPercent != null && course.discountPercent > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          {course.discountPercent}% off
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content-type icons */}
                  <div className="flex gap-2 flex-wrap mt-1">
                    {course.hasVideoCourse    && <span className="text-[10px] text-gray-400">🎬 Videos</span>}
                    {course.hasHtmlCourse     && <span className="text-[10px] text-gray-400">📖 E-Books</span>}
                    {course.hasPdfCourse      && <span className="text-[10px] text-gray-400">📄 PDFs</span>}
                    {course.hasTestSeries     && <span className="text-[10px] text-gray-400">✏️ Tests</span>}
                    {course.hasFlashcardDecks && <span className="text-[10px] text-gray-400">🃏 Flashcards</span>}
                  </div>

                  {/* CTA */}
                  <span className={`mt-2 block w-full text-center text-xs font-bold py-2 rounded-xl transition-colors ${
                    isFreeCourse
                      ? "bg-green-600 text-white group-hover:bg-green-700"
                      : "bg-[#6D4BCB] text-white group-hover:bg-[#5C3DB5]"
                  }`}>
                    {isFreeCourse ? "Start Free →" : hasPricing ? "Buy Now →" : "View Course →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── "See more" hint when showing 6 latest (unfiltered) ────────────── */}
      {!hasFilters && courses.length >= 6 && (
        <div className="text-center pt-2">
          <p className="text-xs text-gray-400 mb-3">
            Showing the 6 most recently added courses. Use the filters above or browse the full catalog for more.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold border-2 border-[#6D4BCB] text-[#6D4BCB] px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors"
          >
            Browse Full Course Catalog →
          </Link>
        </div>
      )}
    </div>
  );
}

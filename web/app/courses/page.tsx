import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { getActiveCourses } from "@/lib/courseDb";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ROUTES } from "@/config/terminology";

export const dynamic = "force-dynamic";

const PRODUCT_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  FREE_DEMO:           { label: "Free Demo",       color: "bg-green-100 text-green-800" },
  COMPLETE_PREP_PACK:  { label: "Complete Pack",   color: "bg-purple-100 text-purple-800" },
  VIDEO_ONLY:          { label: "Video Course",    color: "bg-blue-100 text-blue-800" },
  SELF_PREP:           { label: "Self Prep",       color: "bg-indigo-100 text-indigo-800" },
  PDF_ONLY:            { label: "PDF Notes",       color: "bg-red-100 text-red-800" },
  TEST_SERIES:         { label: "Test Series",     color: "bg-amber-100 text-amber-800" },
  FLASHCARDS_ONLY:     { label: "Flashcards",      color: "bg-yellow-100 text-yellow-800" },
  CURRENT_AFFAIRS:     { label: "Current Affairs", color: "bg-teal-100 text-teal-800" },
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory = sp.category ?? "ALL";

  const [courses, categories] = await Promise.all([
    getActiveCourses({ limit: 50 }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // Filter courses by selected category
  const filtered =
    activeCategory === "ALL"
      ? courses
      : courses.filter((c) => c.categoryId === activeCategory);

  // Category tabs: "All" + each category that has at least one active course
  const categoryIdsWithCourses = new Set(courses.map((c) => c.categoryId).filter(Boolean));
  const tabs = [
    { id: "ALL", name: "All Courses" },
    ...categories.filter((c) => categoryIdsWithCourses.has(c.id)),
  ];

  const isFreeDemo = (productCategory: string) => productCategory === "FREE_DEMO";

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Page Header */}
      <div className="bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-purple-300 text-xs font-semibold uppercase tracking-widest mb-1">
            Saphala Self Prep
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Course Catalog</h1>
          <p className="text-purple-200 text-sm max-w-xl">
            Pick your exam, choose your course, and start preparing today.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-3 min-w-max">
            {tabs.map((tab) => {
              const isActive = tab.id === activeCategory;
              return (
                <Link
                  key={tab.id}
                  href={tab.id === "ALL" ? ROUTES.courses : `${ROUTES.courses}?category=${tab.id}`}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-[#6D4BCB] text-white shadow-sm"
                      : "text-gray-600 hover:bg-purple-50 hover:text-[#6D4BCB]"
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-600 font-semibold mb-1">No courses available yet</p>
            <p className="text-gray-400 text-sm">New courses are being added. Check back soon.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5">
              {filtered.length} course{filtered.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((course) => {
                const badge = PRODUCT_TYPE_BADGES[course.productCategory];
                const free = isFreeDemo(course.productCategory);

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
                  >
                    {/* Thumbnail or gradient banner */}
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
                        <span className="text-white font-bold text-sm text-center leading-snug line-clamp-3">
                          {course.name}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex flex-col flex-1 gap-2">
                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1.5">
                        {free && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            Free
                          </span>
                        )}
                        {badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                        {course.categoryName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {course.categoryName}
                          </span>
                        )}
                      </div>

                      {/* Course name */}
                      <h3 className="text-sm font-bold text-[#2D1B69] leading-snug group-hover:text-[#6D4BCB] transition-colors">
                        {course.name}
                      </h3>

                      {/* Description */}
                      {course.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                          {course.description}
                        </p>
                      )}

                      {/* Content type icons */}
                      <div className="flex gap-2 flex-wrap mt-1">
                        {course.hasVideoCourse && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">🎬 Videos</span>
                        )}
                        {course.hasHtmlCourse && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">📖 Ebooks</span>
                        )}
                        {course.hasPdfCourse && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">📄 PDFs</span>
                        )}
                        {course.hasTestSeries && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">✏️ Tests</span>
                        )}
                        {course.hasFlashcardDecks && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">🃏 Flashcards</span>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="mt-2">
                        <span className={`inline-block w-full text-center text-xs font-bold py-2 rounded-xl transition-colors ${
                          free
                            ? "bg-green-600 text-white group-hover:bg-green-700"
                            : "bg-[#6D4BCB] text-white group-hover:bg-[#5C3DB5]"
                        }`}>
                          {free ? "Start Free →" : "View Course →"}
                        </span>
                      </div>
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

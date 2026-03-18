import { getCourseWithCurriculum } from "@/lib/courseDb";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CurriculumAccordion } from "@/components/courses/CurriculumAccordion";

export const dynamic = "force-dynamic";

const CAPABILITY_BADGES = [
  { key: "hasVideoCourse",    label: "🎬 Videos" },
  { key: "hasHtmlCourse",     label: "📖 E-Books" },
  { key: "hasPdfCourse",      label: "📄 PDFs" },
  { key: "hasTestSeries",     label: "✏️ Tests" },
  { key: "hasFlashcardDecks", label: "🃏 Flashcards" },
] as const;

const PRODUCT_LABEL: Record<string, string> = {
  FREE_DEMO:          "Free Demo",
  COMPLETE_PREP_PACK: "Complete Prep Pack",
  VIDEO_ONLY:         "Video Course",
  SELF_PREP:          "Self Prep",
  PDF_ONLY:           "PDF Notes",
  TEST_SERIES:        "Test Series",
  FLASHCARDS_ONLY:    "Flashcard Decks",
  CURRENT_AFFAIRS:    "Current Affairs",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/courses/${id}`);

  const data = await getCourseWithCurriculum(id);
  if (!data) notFound();

  const isFree = data.productCategory === "FREE_DEMO";
  const productLabel = PRODUCT_LABEL[data.productCategory] ?? data.productCategory;

  const totalItems = data.curriculum.reduce(
    (n, s) => n + s.chapters.reduce((m, ch) => m + ch.lessons.reduce((k, l) => k + l.items.length, 0), 0),
    0
  );
  const totalChapters = data.curriculum.reduce((n, s) => n + s.chapters.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/courses" className="hover:text-[#6D4BCB] transition-colors">
          ← All Courses
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium truncate">{data.name}</span>
      </nav>

      {/* Course header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Banner */}
        {data.thumbnailUrl ? (
          <div className="h-48 sm:h-56 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.thumbnailUrl}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-48 sm:h-56 bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-5xl mb-3">📚</span>
            <h1 className="text-white font-bold text-lg sm:text-xl leading-snug max-w-sm">
              {data.name}
            </h1>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isFree && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-800">
                Free
              </span>
            )}
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
              {productLabel}
            </span>
            {data.categoryName && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                {data.categoryName}
              </span>
            )}
          </div>

          {/* Title (if there's a thumbnail, show title here) */}
          {data.thumbnailUrl && (
            <h1 className="text-xl font-bold text-[#2D1B69] mb-2 leading-snug">{data.name}</h1>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{data.description}</p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[#2D1B69]">{data.curriculum.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Subjects</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#2D1B69]">{totalChapters}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Chapters</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#2D1B69]">{totalItems}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Items</p>
            </div>
          </div>

          {/* Content type badges */}
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_BADGES.map(({ key, label }) =>
              data[key] ? (
                <span
                  key={key}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-100"
                >
                  {label}
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#2D1B69]">Course Content</h2>
          <span className="text-xs text-gray-400">
            {data.curriculum.length} subject{data.curriculum.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isFree ? (
          <CurriculumAccordion curriculum={data.curriculum} />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <span className="text-3xl mb-3 block">🔒</span>
            <p className="font-semibold text-amber-800 mb-1">Purchase Required</p>
            <p className="text-sm text-amber-700">
              This course requires a valid enrollment to access its content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

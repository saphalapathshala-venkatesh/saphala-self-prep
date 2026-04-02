import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { stripHtml } from "@/lib/sanitizeHtml";
import { getEnrolledCourses, getEnrolledValidityMap, type CourseListItem } from "@/lib/courseDb";
import { formatExpiryDate } from "@/lib/validityUtils";

const PRODUCT_LABEL: Record<string, string> = {
  COMPLETE_PREP_PACK: "Complete Prep Pack",
  VIDEO_ONLY:         "Video Course",
  SELF_PREP:          "Self Prep",
  PDF_ONLY:           "PDF Notes",
  TEST_SERIES:        "Test Series",
  FLASHCARDS_ONLY:    "Flashcard Decks",
  CURRENT_AFFAIRS:    "Current Affairs",
};

const CAPABILITY_PILLS = [
  { key: "hasVideoCourse",    label: "🎬 Videos"     },
  { key: "hasHtmlCourse",     label: "📖 E-Books"    },
  { key: "hasPdfCourse",      label: "📄 PDFs"       },
  { key: "hasTestSeries",     label: "✏️ Tests"     },
  { key: "hasFlashcardDecks", label: "🃏 Flashcards" },
] as const;

function CourseCard({
  course,
  validUntil,
}: {
  course: CourseListItem;
  /** ISO string = timed expiry, null = lifetime, undefined = not set */
  validUntil?: string | null;
}) {
  const label = PRODUCT_LABEL[course.productCategory] ?? course.productCategory;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-purple-200 hover:shadow-sm transition-all">
      {/* Thumbnail */}
      {course.thumbnailUrl ? (
        <div className="aspect-video overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.thumbnailUrl}
            alt={course.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] flex flex-col items-center justify-center px-6 text-center">
          <span className="text-4xl mb-2">📚</span>
          <p className="text-white font-semibold text-sm leading-snug line-clamp-2">
            {course.name}
          </p>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Purchased
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
            {label}
          </span>
          {course.categoryName && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {course.categoryName}
            </span>
          )}
        </div>

        {/* Course name */}
        <h3 className="font-bold text-[#2D1B69] text-sm leading-snug line-clamp-2">
          {course.name}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {stripHtml(course.description)}
          </p>
        )}

        {/* Capability pills */}
        <div className="flex flex-wrap gap-1">
          {CAPABILITY_PILLS.map(({ key, label: pillLabel }) =>
            course[key] ? (
              <span
                key={key}
                className="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-500"
              >
                {pillLabel}
              </span>
            ) : null
          )}
        </div>

        {/* Valid until badge */}
        {validUntil !== undefined && (
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-700 leading-tight">
              {validUntil
                ? <>Valid until <span className="font-bold">{formatExpiryDate(validUntil)}</span></>
                : "Lifetime access"}
            </span>
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/courses/${course.id}`}
          className="block w-full text-center py-2.5 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-bold text-sm transition-colors"
        >
          View Course →
        </Link>
      </div>
    </div>
  );
}

export default async function MyPurchasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/purchases");

  const [enrolled, expiryMap] = await Promise.all([
    getEnrolledCourses(user.id).catch(() => []),
    getEnrolledValidityMap(user.id).catch(() => ({} as Record<string, string | null>)),
  ]);

  const purchases = enrolled.filter(
    (c) => !c.isFree && c.productCategory !== "FREE_DEMO"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">My Purchases</h1>
        <p className="text-sm text-gray-500 mt-1">
          {purchases.length > 0
            ? `${purchases.length} purchased course${purchases.length > 1 ? "s" : ""}`
            : "All courses you have purchased appear here"}
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-[#6D4BCB]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[#2D1B69] text-lg mb-2">
            No purchased courses yet
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Browse our courses and unlock premium content to accelerate your
            exam preparation.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchases.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              validUntil={expiryMap[course.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

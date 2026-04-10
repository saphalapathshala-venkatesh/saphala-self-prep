import { getCourseWithCurriculum, checkUserEntitlementForCourse, getLinkedContentForCourse, linkedContentUrl, linkedContentSectionLabel, type LinkedContentRow } from "@/lib/courseDb";
import { type CourseContext } from "@/lib/courseNav";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CurriculumAccordion } from "@/components/courses/CurriculumAccordion";
import { getLiveClassesForStudent } from "@/lib/liveClassDb";
import LiveClassCard from "@/components/live-classes/LiveClassCard";
import type { LiveClassCardData } from "@/components/live-classes/LiveClassCard";
import { getVideosForStudent, formatDuration } from "@/lib/videoDb";

export const dynamic = "force-dynamic";

function formatRupeesINR(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

function formatValidityLabel(
  type: string | null,
  days: number | null,
  months: number | null,
  until: Date | null,
): string | null {
  if (type === "lifetime") return "Lifetime Access";
  if (type === "days" && days != null) {
    if (days % 365 === 0) return `${days / 365} Year${days / 365 > 1 ? "s" : ""}`;
    if (days % 30 === 0) return `${days / 30} Month${days / 30 > 1 ? "s" : ""}`;
    return `${days} Days`;
  }
  if (type === "months" && months != null) {
    return `${months} Month${months > 1 ? "s" : ""}`;
  }
  if (type === "date" && until != null) {
    return `Until ${new Date(until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return null;
}

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

const LINKED_CONTENT_ICON: Record<string, string> = {
  TEST_SERIES:    "✏️",
  VIDEO:          "🎬",
  FLASHCARD_DECK: "🃏",
  HTML_PAGE:      "📖",
  PDF:            "📄",
};

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const rawLessonId = sp["lessonId"];
  const initialLessonId = typeof rawLessonId === "string" ? rawLessonId : Array.isArray(rawLessonId) ? rawLessonId[0] : undefined;

  // PERF: auth + curriculum fetched in parallel — both only need the courseId.
  const [user, data] = await Promise.all([
    getCurrentUser(),
    getCourseWithCurriculum(id),
  ]);
  if (!user) redirect(`/login?from=/courses/${id}`);
  if (!data) notFound();

  const [isEntitled, liveClasses, linkedContent, courseVideos] = await Promise.all([
    checkUserEntitlementForCourse(user.id, id, data.productCategory).catch(() => false),
    getLiveClassesForStudent({ userId: user.id, courseId: id, limit: 10 }).catch(() => []),
    getLinkedContentForCourse(id).catch((): LinkedContentRow[] => []),
    getVideosForStudent({ userId: user.id, courseId: id, limit: 50 }).catch(() => []),
  ]);

  const isFree      = data.isFree || data.productCategory === "FREE_DEMO";
  const canAccess   = isEntitled; // FREE_DEMO always returns true from checkUserEntitlementForCourse
  const productLabel = PRODUCT_LABEL[data.productCategory] ?? data.productCategory;
  // Admin-set Course.sellingPrice is the authoritative base price
  const hasPricing  = !isFree && data.sellingPrice != null && data.sellingPrice > 0;
  // Include courseId so the checkout page can display the admin-set selling price
  const checkoutHref = data.packageId
    ? `/checkout?packageId=${data.packageId}&courseId=${data.id}`
    : "/plans";

  const totalItems = data.curriculum.reduce(
    (n, s) => n + s.chapters.reduce((m, ch) => m + ch.lessons.reduce((k, l) => k + l.items.length, 0), 0),
    0
  );
  const totalChapters = data.curriculum.reduce((n, s) => n + s.chapters.length, 0);

  // Group linked content by type for display
  const linkedByType = linkedContent.reduce<Record<string, typeof linkedContent>>((acc, row) => {
    if (!acc[row.contentType]) acc[row.contentType] = [];
    acc[row.contentType].push(row);
    return acc;
  }, {});
  const linkedTypes = Object.keys(linkedByType);

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
        {/* Banner — aspect-video keeps full 16:9 YouTube thumbnail visible */}
        {data.thumbnailUrl ? (
          <div className="aspect-video overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.thumbnailUrl}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] flex flex-col items-center justify-center px-6 text-center">
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
            {!isFree && canAccess && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Enrolled
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
            <div
              className="text-sm text-gray-600 leading-relaxed mb-4 rich-html overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
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
            {linkedContent.length > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-[#2D1B69]">{linkedContent.length}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Extras</p>
              </div>
            )}
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

      {/* ── Purchase CTA (non-entitled paid courses) ─────────────────────────── */}
      {!isFree && !canAccess && (
        <div className="bg-gradient-to-r from-[#2D1B69] to-[#6D4BCB] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Get full access to this course</p>
            <p className="text-purple-200 text-xs mt-1 leading-relaxed">
              Purchase this course to unlock all lessons, tests, videos, flashcards, and more.
            </p>
            {/* Pricing */}
            {hasPricing && (
              <div className="flex items-baseline gap-2.5 mt-3 flex-wrap">
                <span className="text-white text-2xl font-bold">
                  {formatRupeesINR(data.sellingPrice!)}
                </span>
                {data.mrp != null && data.mrp > data.sellingPrice! && (
                  <span className="text-purple-300 text-sm line-through">
                    {formatRupeesINR(data.mrp)}
                  </span>
                )}
                {data.discountPercent != null && data.discountPercent > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-400/20 text-green-200 border border-green-400/30">
                    {data.discountPercent}% off
                  </span>
                )}
              </div>
            )}
            {/* Validity */}
            {(() => {
              const vLabel = formatValidityLabel(data.validityType, data.validityDays, data.validityMonths, data.validUntil ?? null);
              return vLabel ? (
                <p className="text-purple-200 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Validity: {vLabel}
                </p>
              ) : null;
            })()}
          </div>
          <Link
            href={checkoutHref}
            className="flex-shrink-0 px-6 py-3 rounded-xl bg-white text-[#2D1B69] font-bold text-sm hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            {hasPricing ? "Buy Now →" : "View Plans →"}
          </Link>
        </div>
      )}

      {/* ── Curriculum ───────────────────────────────────────────────────────── */}
      {data.curriculum.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#2D1B69]">Course Content</h2>
            <span className="text-xs text-gray-400">
              {data.curriculum.length} subject{data.curriculum.length !== 1 ? "s" : ""}
            </span>
          </div>

          {!canAccess && !isFree && (
            <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Course preview — enroll to access all content
            </div>
          )}

          <CurriculumAccordion
            curriculum={data.curriculum}
            entitlementLocked={!canAccess}
            courseId={id}
            initialLessonId={initialLessonId}
          />
        </div>
      )}

      {/* ── Linked content sections ──────────────────────────────────────────── */}
      {linkedTypes.map((contentType) => {
        const items = linkedByType[contentType];
        const sectionLabel = linkedContentSectionLabel(contentType);
        const icon = LINKED_CONTENT_ICON[contentType] ?? "📌";
        const courseCtx: CourseContext = { courseId: id };

        return (
          <div key={contentType}>
            <div className="flex items-center gap-2 mb-3">
              <span>{icon}</span>
              <h2 className="text-base font-bold text-[#2D1B69]">{sectionLabel}</h2>
              <span className="text-xs text-gray-400 ml-1">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const url = canAccess ? linkedContentUrl(item, courseCtx) : null;
                const row = (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
                    canAccess && url
                      ? "bg-white border-gray-100 hover:border-[#6D4BCB] hover:shadow-sm cursor-pointer"
                      : "bg-gray-50/70 border-gray-100 opacity-75 cursor-default"
                  }`}>
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <p className={`flex-1 text-sm font-medium leading-snug line-clamp-1 ${canAccess ? "text-[#2D1B69]" : "text-gray-400"}`}>
                      {item.title}
                    </p>
                    {canAccess && url ? (
                      <svg className="w-4 h-4 text-[#6D4BCB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    ) : !canAccess ? (
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : null}
                  </div>
                );
                return url ? (
                  <Link key={item.id} href={url}>{row}</Link>
                ) : (
                  <div key={item.id}>{row}</div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Recorded Videos for this course ──────────────────────────────────── */}
      {courseVideos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-base font-bold text-[#2D1B69]">Recorded Videos</h2>
              <span className="text-xs text-gray-400">{courseVideos.length}</span>
            </div>
            <Link
              href={`/videos?courseId=${id}`}
              className="text-xs text-[#6D4BCB] hover:text-[#5C3DB5] font-medium transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {courseVideos.map((video) => {
              const isLocked = !video.isEntitled && !video.allowPreview;
              const duration = formatDuration(video.durationSeconds);
              const row = (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
                  !isLocked
                    ? "bg-white border-gray-100 hover:border-[#6D4BCB] hover:shadow-sm cursor-pointer"
                    : "bg-gray-50/70 border-gray-100 opacity-75 cursor-default"
                }`}>
                  {/* Thumbnail or play icon */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug line-clamp-1 ${isLocked ? "text-gray-400" : "text-[#2D1B69]"}`}>
                      {video.title}
                    </p>
                    {(video.facultyName || duration) && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {[video.facultyName, duration].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {/* Right icon */}
                  {isLocked ? (
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-[#6D4BCB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              );
              return isLocked ? (
                <div key={video.id}>{row}</div>
              ) : (
                <Link key={video.id} href={`/videos/${video.id}`}>{row}</Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live Classes for this course ─────────────────────────────────────── */}
      {liveClasses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <h2 className="text-base font-bold text-[#2D1B69]">Live Classes</h2>
            </div>
            <Link
              href={`/live-classes?courseId=${id}`}
              className="text-xs text-[#6D4BCB] hover:text-[#5C3DB5] font-medium transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liveClasses.slice(0, 4).map((cls) => {
              const cardData: LiveClassCardData = {
                id:            cls.id,
                title:         cls.title,
                description:   cls.description,
                facultyName:   cls.facultyName,
                facultyTitle:  cls.facultyTitle,
                sessionDate:   cls.sessionDate ? cls.sessionDate.toISOString() : null,
                startTime:     cls.startTime,
                endTime:       cls.endTime,
                status:        cls.status,
                liveStatus:    cls.liveStatus,
                canJoin:       cls.canJoin,
                joinOpensAt:   cls.joinOpensAt,
                joinUrl:       cls.joinUrl,
                platform:      cls.platform,
                thumbnailUrl:  cls.thumbnailUrl,
                replayVideoId: cls.replayVideoId,
                courseId:      cls.courseId,
                isEntitled:    cls.isEntitled,
                unlockAt:      cls.unlockAt ? cls.unlockAt.toISOString() : null,
              };
              return <LiveClassCard key={cls.id} cls={cardData} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

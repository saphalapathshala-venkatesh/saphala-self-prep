import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getVideoById, getCoursesForVideo, formatDuration, type CourseSuggestion } from "@/lib/videoDb";
import Link from "next/link";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";
import VideoPlayerWithXp from "@/components/video/VideoPlayerWithXp";

export const dynamic = "force-dynamic";

function formatPrice(price: number | null, isFree: boolean): string {
  if (isFree) return "Free";
  if (!price || price <= 0) return "Contact for price";
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function CourseCard({ course }: { course: CourseSuggestion }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col sm:flex-row gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:border-[#6D4BCB]/30 hover:shadow-md transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-full sm:w-28 h-20 sm:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div>
          {course.categoryName && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 mb-1.5 inline-block">
              {course.categoryName}
            </span>
          )}
          <p className="text-sm font-bold text-[#2D1B69] leading-snug group-hover:text-[#6D4BCB] transition-colors line-clamp-2">
            {course.name}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {course.isFree ? (
              <span className="text-sm font-bold text-green-700">Free</span>
            ) : (
              <>
                <span className="text-sm font-bold text-[#2D1B69]">
                  {formatPrice(course.sellingPrice, course.isFree)}
                </span>
                {course.mrp && course.sellingPrice && Number(course.mrp) > Number(course.sellingPrice) && (
                  <span className="text-xs text-gray-400 line-through">
                    ₹{Number(course.mrp).toLocaleString("en-IN")}
                  </span>
                )}
              </>
            )}
          </div>
          <span className="text-xs font-semibold text-[#6D4BCB] group-hover:underline flex-shrink-0">
            View Course →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function VideoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/videos/${id}`);

  const video = await getVideoById(id, user.id);
  if (!video) notFound();

  const ctx       = parseCourseContext(sp);
  const backHref  = ctx ? courseReturnUrl(ctx) : "/videos";
  const backLabel = ctx ? "← Back to Course" : "← Recorded Videos";

  const isLocked = !video.isEntitled && !video.allowPreview;
  const canWatch = video.isEntitled || video.allowPreview;
  const duration = formatDuration(video.durationSeconds);

  // Fetch course suggestions only when locked — zero overhead for entitled students
  // Only courses that ACTUALLY contain this video are returned (no category guesses)
  const courseSuggestions = isLocked
    ? await getCoursesForVideo(id, video.courseId)
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href={backHref} className="hover:text-[#6D4BCB] transition-colors">
          {backLabel}
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate">{video.title}</span>
      </nav>

      {/* Player + XP banner + Ask a Doubt */}
      <VideoPlayerWithXp
        videoId={id}
        title={video.title}
        thumbnailUrl={video.thumbnailUrl}
        playbackApiUrl={`/api/student/videos/${id}/playback`}
        courseId={video.courseId ?? undefined}
        xpEnabled={video.xpEnabled}
        xpValue={video.xpValue}
        canWatch={canWatch}
        isLocked={isLocked}
        accessType={video.accessType}
      />

      {/* ── Enrollment required — course suggestions ── */}
      {isLocked && (
        <div className="bg-white rounded-2xl border border-[#6D4BCB]/20 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#2D1B69]">
                {courseSuggestions.length === 1
                  ? "This video is available in the course below"
                  : courseSuggestions.length > 1
                  ? `This video is available in ${courseSuggestions.length} courses`
                  : "Purchase a course to unlock this video"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {courseSuggestions.length > 0
                  ? "Purchase any one of the courses below to get instant access to this video."
                  : "This video requires a course purchase. Browse our courses to find the right one."}
              </p>
            </div>
          </div>

          {/* Course cards */}
          {courseSuggestions.length > 0 ? (
            <div className="p-4 space-y-3">
              {courseSuggestions.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-400 mb-3">No courses found for this video.</p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#6D4BCB] hover:bg-[#5C3DB5] px-5 py-2.5 rounded-xl transition-colors"
              >
                Browse All Courses
              </Link>
            </div>
          )}

          {/* Footer link */}
          {courseSuggestions.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-50 text-center">
              <Link
                href="/courses"
                className="text-xs font-semibold text-[#6D4BCB] hover:underline"
              >
                Browse all courses →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Video metadata card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
        <h1 className="text-xl font-bold text-[#2D1B69] leading-snug">{video.title}</h1>

        <div className="flex flex-wrap gap-2 items-center">
          {duration && (
            <span className="text-xs text-gray-400">⏱ {duration}</span>
          )}
          {video.facultyName && (
            <span className="text-xs text-gray-500">
              · <span className="font-medium">{video.facultyName}</span>
            </span>
          )}
        </div>

        {video.description && (
          <div
            className="text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3 rich-html overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: video.description }}
          />
        )}
      </div>

      {/* My doubts link */}
      {canWatch && (
        <div className="flex justify-end">
          <Link href="/doubts" className="text-xs text-[#6D4BCB] hover:underline">
            View all my doubts →
          </Link>
        </div>
      )}
    </div>
  );
}

import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getVideoById, formatDuration } from "@/lib/videoDb";
import Link from "next/link";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";
import { getMockPlaybackSource } from "@/lib/video/getMockPlaybackSource";
import CourseVideoPlayer from "@/components/video/CourseVideoPlayer";

export const dynamic = "force-dynamic";

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

  const ctx      = parseCourseContext(sp);
  const backHref  = ctx ? courseReturnUrl(ctx) : "/videos";
  const backLabel = ctx ? "← Back to Course" : "← Recorded Videos";

  const isLocked  = !video.isEntitled && !video.allowPreview;
  const canWatch  = video.isEntitled || video.allowPreview;
  const isYoutube = video.provider === "YOUTUBE" && video.providerVideoId;
  const duration  = formatDuration(video.durationSeconds);

  // ── Resolve the HLS manifest URL ──────────────────────────────────────────
  // Priority: real hlsUrl from DB → mock source (dev-only, swapped with
  // GET /api/videos/:id/playback once Bunny backend is integrated).
  const manifestUrl: string | null = (() => {
    if (!canWatch) return null;
    if (isYoutube) return null;
    if (video.hlsUrl) return video.hlsUrl;
    // Mock: isolates the temporary source in one helper — easy to replace.
    return getMockPlaybackSource(video.id).manifestUrl;
  })();

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

      {/* Player area */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* ── YouTube iframe ────────────────────────────────────────── */}
        {canWatch && isYoutube ? (
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${video.providerVideoId}?rel=0&modestbranding=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>

        /* ── HLS / native video via CourseVideoPlayer ──────────────── */
        ) : canWatch && manifestUrl ? (
          <CourseVideoPlayer
            title={video.title}
            manifestUrl={manifestUrl}
            posterUrl={video.thumbnailUrl}
            lessonId={undefined}
            courseId={video.courseId ?? undefined}
          />

        /* ── Locked ────────────────────────────────────────────────── */
        ) : isLocked ? (
          <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">Enroll to watch this video</p>
          </div>

        /* ── No source yet ─────────────────────────────────────────── */
        ) : (
          <div className="h-64 bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-white/70">Video not yet available</p>
          </div>
        )}

        {/* Video metadata */}
        <div className="p-6 space-y-3">

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {video.accessType === "FREE" && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                Free
              </span>
            )}
            {isLocked && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Enrollment Required
              </span>
            )}
            {duration && (
              <span className="text-xs text-gray-400">⏱ {duration}</span>
            )}
          </div>

          <h1 className="text-xl font-bold text-[#2D1B69] leading-snug">{video.title}</h1>

          {video.facultyName && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Faculty:</span> {video.facultyName}
            </p>
          )}

          {video.description && (
            <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
              {video.description}
            </p>
          )}

          {isLocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-800 mt-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              This video is part of a paid course. Enroll to get full access.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

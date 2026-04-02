import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getVideoById, formatDuration } from "@/lib/videoDb";
import Link from "next/link";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";
import VideoPlayerWithXp from "@/components/video/VideoPlayerWithXp";

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

  const ctx       = parseCourseContext(sp);
  const backHref  = ctx ? courseReturnUrl(ctx) : "/videos";
  const backLabel = ctx ? "← Back to Course" : "← Recorded Videos";

  const isLocked = !video.isEntitled && !video.allowPreview;
  const canWatch = video.isEntitled || video.allowPreview;
  const duration = formatDuration(video.durationSeconds);

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

        {isLocked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This video is part of a paid course. Enroll to get full access.
          </div>
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

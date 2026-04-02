import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLiveClassById, formatSessionDateTime } from "@/lib/liveClassDb";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LiveClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/live-classes/${id}`);

  const cls = await getLiveClassById(id, user.id);
  if (!cls) notFound();

  const isLive       = cls.liveStatus === "LIVE_NOW"  && cls.isEntitled;
  const isUpcoming   = cls.liveStatus === "UPCOMING"  && cls.isEntitled;
  const isCompleted  = cls.liveStatus === "COMPLETED" || cls.liveStatus === "ENDED";
  const isLocked     = cls.liveStatus === "LOCKED"    || !cls.isEntitled;

  const statusColors: Record<string, string> = {
    LIVE_NOW:  "bg-red-600 text-white",
    UPCOMING:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    COMPLETED: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    ENDED:     "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    LOCKED:    "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };

  const statusLabel: Record<string, string> = {
    LIVE_NOW:  "LIVE NOW",
    UPCOMING:  "Upcoming",
    COMPLETED: "Completed",
    ENDED:     "Ended",
    LOCKED:    "Locked",
  };

  const displayStatus = !cls.isEntitled ? "LOCKED" : cls.liveStatus;
  const dateLabel = formatSessionDateTime(cls.sessionDate, cls.startTime, cls.endTime);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/live-classes" className="hover:text-[#6D4BCB] transition-colors">
          ← Live Classes
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate">{cls.title}</span>
      </nav>

      {/* Main card */}
      <div className={`bg-white rounded-2xl border overflow-hidden ${isLive ? "border-red-200 shadow-lg shadow-red-50" : "border-gray-100"}`}>

        {/* Banner */}
        {cls.thumbnailUrl ? (
          <div className="h-52 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cls.thumbnailUrl} alt={cls.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`h-40 flex items-center justify-center ${
            isLive      ? "bg-gradient-to-br from-red-600 to-orange-500"
            : isLocked  ? "bg-gradient-to-br from-gray-200 to-gray-300"
            : isCompleted ? "bg-gradient-to-br from-gray-300 to-gray-400"
            : "bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB]"
          }`}>
            {isLocked ? (
              <svg className="w-14 h-14 text-gray-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-14 h-14 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            )}
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Status + platform */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusColors[displayStatus] ?? "bg-gray-100 text-gray-600"} ${isLive ? "animate-pulse" : ""}`}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
              {statusLabel[displayStatus] ?? displayStatus}
            </span>
            {cls.platform === "ZOOM" && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white leading-none">Zoom</span>}
            {cls.platform === "YOUTUBE_LIVE" && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-600 text-white leading-none">YouTube Live</span>}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-[#2D1B69] leading-snug">{cls.title}</h1>

          {/* Faculty */}
          {cls.facultyName && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Faculty:</span>{" "}
              {cls.facultyTitle ? `${cls.facultyTitle} ` : ""}{cls.facultyName}
            </p>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4 flex-shrink-0 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {dateLabel}
          </div>

          {/* Description */}
          {cls.description && (
            <div
              className="text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3 rich-html overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: cls.description }}
            />
          )}

          {/* CTA */}
          <div className="pt-2 space-y-3">

            {/* Not entitled — locked */}
            {isLocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Enrollment Required</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You need to enroll in this course to access the live class.
                  </p>
                </div>
              </div>
            )}

            {/* Live + canJoin */}
            {isLive && cls.canJoin && cls.joinUrl && (
              <div className="space-y-2">
                <a
                  href={cls.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  Join LIVE Class
                </a>
                {cls.sessionCode && (
                  <p className="text-xs text-gray-500 text-center">
                    Session code: <span className="font-mono font-semibold text-gray-700">{cls.sessionCode}</span>
                  </p>
                )}
              </div>
            )}

            {/* Live but joining not ready */}
            {isLive && !cls.canJoin && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                Class is live — join link will be visible shortly.
              </div>
            )}

            {/* Upcoming */}
            {isUpcoming && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Join link will be available 10 minutes before the class starts.
              </div>
            )}

            {/* Completed with replay */}
            {isCompleted && cls.replayVideoId && (
              <div className="bg-[#F6F2FF] border border-[#E0D5FF] rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-[#2D1B69]">Replay Available</p>
                <p className="text-xs text-gray-500">This session has been recorded and is available for review.</p>
                <a
                  href={`https://www.youtube.com/watch?v=${cls.replayVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Replay
                </a>
              </div>
            )}

            {/* Completed without replay */}
            {isCompleted && !cls.replayVideoId && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500 text-center">
                This session has ended. No replay is available at this time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

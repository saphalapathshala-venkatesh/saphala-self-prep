import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVideosForStudent, formatDuration } from "@/lib/videoDb";
import Link from "next/link";
import { isTimeLocked, formatUnlockAt } from "@/lib/formatUnlockAt";

export const dynamic = "force-dynamic";

function VideoCard({ video }: {
  video: Awaited<ReturnType<typeof getVideosForStudent>>[0];
}) {
  const isTimeLockedVideo = isTimeLocked(video.unlockAt);
  const isLocked = isTimeLockedVideo || (!video.isEntitled && !video.allowPreview);
  const duration = formatDuration(video.durationSeconds);

  return (
    <Link
      href={`/videos/${video.id}`}
      className={`group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow ${isLocked ? "opacity-75" : ""}`}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden bg-gray-100">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isLocked ? "bg-gradient-to-br from-gray-200 to-gray-300" : "bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB]"
          }`}>
            {isLocked ? (
              <svg className="w-10 h-10 text-gray-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        )}

        {/* Duration badge */}
        {duration && !isLocked && (
          <span className="absolute bottom-2 right-2 text-[10px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded">
            {duration}
          </span>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white/90 rounded-full p-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        )}

        {/* Free badge */}
        {video.accessType === "FREE" && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">
            Free
          </span>
        )}
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2 group-hover:text-[#6D4BCB] transition-colors">
          {video.title}
        </h3>
        {video.facultyName && (
          <p className="text-xs text-gray-500">{video.facultyName}</p>
        )}
        {isTimeLockedVideo && video.unlockAt ? (
          <p className="text-xs text-orange-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            Unlocks {formatUnlockAt(video.unlockAt)}
          </p>
        ) : isLocked ? (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Enroll to watch
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default async function VideosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/videos");

  const videos = await getVideosForStudent({ userId: user.id, limit: 60 });

  const free   = videos.filter((v) => v.accessType === "FREE");
  const paid   = videos.filter((v) => v.accessType !== "FREE");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">Recorded Videos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Watch recorded sessions and topic-wise video lessons.
        </p>
      </div>

      {videos.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <div className="text-5xl">🎬</div>
          <p className="font-semibold text-[#2D1B69]">No videos available yet</p>
          <p className="text-sm text-gray-500">Video lessons will appear here once published.</p>
        </div>
      )}

      {/* Free videos */}
      {free.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">Free</span>
            <h2 className="text-base font-bold text-[#2D1B69]">Free Videos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {free.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}

      {/* Paid / enrolled videos */}
      {paid.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-[#2D1B69] mb-4">Course Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paid.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}
    </div>
  );
}

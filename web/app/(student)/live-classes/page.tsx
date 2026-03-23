import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLiveClassesForStudent } from "@/lib/liveClassDb";
import LiveClassCard from "@/components/live-classes/LiveClassCard";
import type { LiveClassCardData } from "@/components/live-classes/LiveClassCard";

export const dynamic = "force-dynamic";

export default async function LiveClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/live-classes");

  const classes = await getLiveClassesForStudent({ limit: 50 });

  const live      = classes.filter((c) => c.liveStatus === "LIVE_NOW");
  const upcoming  = classes.filter((c) => c.liveStatus === "UPCOMING");
  const ended     = classes.filter((c) => c.liveStatus === "ENDED" || c.liveStatus === "COMPLETED");
  const locked    = classes.filter((c) => c.liveStatus === "LOCKED");

  const toCardData = (c: typeof classes[0]): LiveClassCardData => ({
    id:           c.id,
    title:        c.title,
    description:  c.description,
    facultyName:  c.facultyName,
    facultyTitle: c.facultyTitle,
    sessionDate:  c.sessionDate ? c.sessionDate.toISOString() : null,
    startTime:    c.startTime,
    endTime:      c.endTime,
    status:       c.status,
    liveStatus:   c.liveStatus,
    canJoin:      c.canJoin,
    joinUrl:      c.joinUrl,
    platform:     c.platform,
    thumbnailUrl: c.thumbnailUrl,
    replayVideoId: c.replayVideoId,
    courseId:     c.courseId,
  });

  const isEmpty = classes.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">Live Classes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Join scheduled sessions, watch replays, and track upcoming classes.
        </p>
      </div>

      {isEmpty && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <div className="text-5xl">📡</div>
          <p className="font-semibold text-[#2D1B69]">No live classes scheduled yet</p>
          <p className="text-sm text-gray-500">
            Check back soon — upcoming sessions will appear here.
          </p>
        </div>
      )}

      {/* Live Now */}
      {live.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-base font-bold text-red-700">Happening Now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {live.map((cls) => (
              <LiveClassCard key={cls.id} cls={toCardData(cls)} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-[#2D1B69] mb-4">Upcoming Classes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcoming.map((cls) => (
              <LiveClassCard key={cls.id} cls={toCardData(cls)} />
            ))}
          </div>
        </section>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-[#2D1B69] mb-4">Restricted Classes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {locked.map((cls) => (
              <LiveClassCard key={cls.id} cls={toCardData(cls)} />
            ))}
          </div>
        </section>
      )}

      {/* Completed / Ended */}
      {ended.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-[#2D1B69] mb-4">Past Classes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ended.map((cls) => (
              <LiveClassCard key={cls.id} cls={toCardData(cls)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

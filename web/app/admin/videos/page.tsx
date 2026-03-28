import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/db";
import AdminVideoXpControls from "./AdminVideoXpControls";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  return `${m}m`;
}

export default async function AdminVideosPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const videos = await prisma.$queryRawUnsafe<{
    id: string;
    title: string;
    provider: string;
    durationSeconds: number | null;
    xpEnabled: boolean;
    xpValue: number;
    status: string;
    facultyName: string | null;
  }[]>(`
    SELECT
      v.id, v.title, v.provider, v."durationSeconds",
      v."xpEnabled", v."xpValue", v.status,
      f.name AS "facultyName"
    FROM "Video" v
    LEFT JOIN "Faculty" f ON f.id = v."facultyId"
    WHERE v.status = 'PUBLISHED'
    ORDER BY v."publishedAt" DESC NULLS LAST, v."createdAt" DESC
    LIMIT 200
  `);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">Video XP Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure Sadhana Points (XP) awarded to students on video completion.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>XP Policy:</strong> 1st watch = 100% XP · 2nd watch = 50% XP · 3rd+ watch = 0 XP
      </div>

      {videos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No published videos found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-50 gap-4">
            <span>Video</span>
            <span className="w-20 text-center">Duration</span>
            <span className="w-20 text-center">XP Value</span>
            <span className="w-16 text-center">Enabled</span>
          </div>
          <div className="divide-y divide-gray-50">
            {videos.map((video) => (
              <div key={video.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2D1B69] truncate">{video.title}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {video.provider}
                    {video.facultyName && ` · ${video.facultyName}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 w-20 text-center">
                  {formatDuration(video.durationSeconds)}
                </span>
                <AdminVideoXpControls
                  videoId={video.id}
                  initialXpEnabled={video.xpEnabled}
                  initialXpValue={video.xpValue}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

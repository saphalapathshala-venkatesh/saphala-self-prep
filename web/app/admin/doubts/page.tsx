import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/db";
import Link from "next/link";
import AdminDoubtActions from "./AdminDoubtActions";
import type { DoubtStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<DoubtStatus, string> = {
  OPEN:      "Open",
  ANSWERED:  "Answered",
  ADDRESSED: "Addressed",
  CLOSED:    "Closed",
};

const STATUS_STYLES: Record<DoubtStatus, string> = {
  OPEN:      "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  ANSWERED:  "bg-green-50 text-green-700 ring-1 ring-green-200",
  ADDRESSED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  CLOSED:    "bg-gray-100 text-gray-500",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export default async function AdminDoubtsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const sp = await searchParams;
  const filterStatus = (sp.status as DoubtStatus | undefined) ?? undefined;

  const doubts = await prisma.doubt.findMany({
    where: filterStatus ? { status: filterStatus } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user:         { select: { id: true, name: true, fullName: true, email: true, mobile: true } },
      answerAuthor: { select: { id: true, name: true, fullName: true, role: true } },
    },
  });

  const counts = await prisma.doubt.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  const filterStatuses: DoubtStatus[] = ["OPEN", "ANSWERED", "ADDRESSED", "CLOSED"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">Doubt Management</h1>
        <p className="text-sm text-gray-500 mt-1">Review and respond to student doubts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {filterStatuses.map((s) => (
          <Link
            key={s}
            href={s === filterStatus ? "/admin/doubts" : `/admin/doubts?status=${s}`}
            className={`rounded-xl border p-4 text-center transition-colors ${
              filterStatus === s ? "bg-[#2D1B69] border-[#2D1B69] text-white" : "bg-white border-gray-100 hover:border-[#6D4BCB]/30"
            }`}
          >
            <p className={`text-2xl font-black ${filterStatus === s ? "text-white" : "text-[#2D1B69]"}`}>
              {countMap[s] ?? 0}
            </p>
            <p className={`text-xs font-semibold mt-0.5 ${filterStatus === s ? "text-white/80" : "text-gray-500"}`}>
              {STATUS_LABEL[s]}
            </p>
          </Link>
        ))}
      </div>

      {/* Doubt list */}
      {doubts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No doubts found{filterStatus ? ` with status "${STATUS_LABEL[filterStatus]}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => {
            const studentName = doubt.user.fullName || doubt.user.name || "Student";
            return (
              <div key={doubt.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-start gap-4 px-5 py-4 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#2D1B69] truncate">
                        {doubt.title ?? <span className="italic text-gray-400">No title</span>}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[doubt.status]}`}>
                        {STATUS_LABEL[doubt.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {studentName}
                      {doubt.user.email && ` · ${doubt.user.email}`}
                      {doubt.user.mobile && ` · ${doubt.user.mobile}`}
                      {" · "}{formatDate(doubt.createdAt)}
                    </p>
                  </div>
                  {doubt.videoId && (
                    <Link
                      href={`/videos/${doubt.videoId}`}
                      target="_blank"
                      className="text-xs text-[#6D4BCB] hover:underline flex-shrink-0"
                    >
                      View video ↗
                    </Link>
                  )}
                </div>

                {/* Doubt body */}
                <div className="px-5 py-4 bg-gray-50/50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{doubt.body}</p>
                </div>

                {/* Existing answer */}
                {doubt.answer && (
                  <div className="px-5 py-4 space-y-2 border-t border-gray-50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Answer</p>
                    <div className="rounded-xl p-3 bg-purple-50 border border-purple-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {doubt.answerAuthor?.fullName || doubt.answerAuthor?.name || "Mentor"}
                          <span className="ml-1.5 text-[10px] text-[#6D4BCB]">Mentor</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{doubt.answer}</p>
                    </div>
                  </div>
                )}

                {/* Reply / Close actions */}
                <AdminDoubtActions doubtId={doubt.id} currentStatus={doubt.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

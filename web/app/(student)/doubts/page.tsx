import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import type { DoubtStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<DoubtStatus, string> = {
  OPEN:      "Open",
  ADDRESSED: "Answered",
  CLOSED:    "Closed",
};

const STATUS_STYLES: Record<DoubtStatus, string> = {
  OPEN:      "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  ADDRESSED: "bg-green-50 text-green-700 ring-1 ring-green-200",
  CLOSED:    "bg-gray-100 text-gray-500",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(d));
}

export default async function MyDoubtsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/doubts");

  const doubts = await prisma.doubt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true, fullName: true, role: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2D1B69]">My Doubts</h1>
          <p className="text-sm text-gray-500 mt-1">Questions you&apos;ve asked our mentors</p>
        </div>
        <span className="text-xs text-gray-400">{doubts.length} doubt{doubts.length !== 1 ? "s" : ""}</span>
      </div>

      {doubts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700">No doubts yet</p>
            <p className="text-sm text-gray-400 mt-1">
              While watching a video, click <strong>Ask a Doubt</strong> to submit your question.
            </p>
          </div>
          <Link
            href="/videos"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#6D4BCB] text-white px-4 py-2 rounded-xl hover:bg-[#5c3dba] transition-colors"
          >
            Browse Videos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <div key={doubt.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Doubt header */}
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#2D1B69] truncate">{doubt.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(doubt.createdAt)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[doubt.status]}`}>
                  {STATUS_LABEL[doubt.status]}
                </span>
              </div>

              {/* Doubt body */}
              <div className="px-5 py-4 bg-gray-50/50">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{doubt.body}</p>
                <Link
                  href={`/videos/${doubt.videoId}`}
                  className="inline-flex items-center gap-1 text-xs text-[#6D4BCB] hover:underline mt-2"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Go to video
                </Link>
              </div>

              {/* Replies */}
              {doubt.replies.length > 0 && (
                <div className="px-5 py-4 space-y-3 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Mentor Replies</p>
                  {doubt.replies.map((reply) => (
                    <div key={reply.id} className={`rounded-xl p-3 ${reply.isAdminReply ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${reply.isAdminReply ? "bg-[#6D4BCB] text-white" : "bg-gray-200 text-gray-600"}`}>
                          {(reply.author.fullName || reply.author.name || "M").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {reply.author.fullName || reply.author.name || "Mentor"}
                          {reply.isAdminReply && (
                            <span className="ml-1.5 text-[10px] font-bold text-[#6D4BCB] bg-purple-100 px-1.5 py-0.5 rounded-full">Mentor</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {doubt.replies.length === 0 && doubt.status === "OPEN" && (
                <div className="px-5 py-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400 italic">Awaiting mentor response…</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

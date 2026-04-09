"use client";

import Link from "next/link";
import type { LiveStatus } from "@/lib/liveClassDb";
import LiveClassAutoRefresh from "@/components/live-classes/LiveClassAutoRefresh";

export interface LiveClassCardData {
  id: string;
  title: string;
  description: string | null;
  facultyName: string | null;
  facultyTitle: string | null;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  liveStatus: LiveStatus;
  canJoin: boolean;
  joinUrl: string | null;
  platform: string;
  thumbnailUrl: string | null;
  replayVideoId: string | null;
  courseId: string | null;
  isEntitled: boolean;
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isEntitled }: { status: LiveStatus; isEntitled: boolean }) {
  if (!isEntitled && status !== "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Locked
      </span>
    );
  }

  switch (status) {
    case "LIVE_NOW":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
          LIVE NOW
        </span>
      );
    case "UPCOMING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Upcoming
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-200">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Completed
        </span>
      );
    case "ENDED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 ring-1 ring-orange-200">
          Ended
        </span>
      );
    case "LOCKED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Locked
        </span>
      );
    default:
      return null;
  }
}

// ── Platform badge ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "ZOOM") {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white leading-none">Zoom</span>;
  }
  if (platform === "YOUTUBE_LIVE") {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-600 text-white leading-none">YouTube Live</span>;
  }
  return null;
}

// ── Date/time ─────────────────────────────────────────────────────────────────

function formatDate(sessionDate: string | null, startTime: string | null, endTime: string | null) {
  if (!sessionDate) return "Date TBA";
  const d = new Date(sessionDate);
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  if (!startTime) return dateLabel;
  const time = endTime ? `${startTime} – ${endTime} IST` : `${startTime} IST`;
  return `${dateLabel}  ·  ${time}`;
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function LiveClassCard({ cls }: { cls: LiveClassCardData }) {
  const effectiveLocked   = !cls.isEntitled || cls.liveStatus === "LOCKED";
  const isLive            = cls.liveStatus === "LIVE_NOW" && cls.isEntitled;
  const isUpcoming        = cls.liveStatus === "UPCOMING" && cls.isEntitled;
  const isCompleted       = (cls.liveStatus === "COMPLETED" || cls.liveStatus === "ENDED");

  return (
    <>
    <LiveClassAutoRefresh
      liveStatus={cls.liveStatus}
      sessionDate={cls.sessionDate}
      startTime={cls.startTime}
      endTime={cls.endTime}
    />
    <div
      className={`
        relative bg-white rounded-2xl border overflow-hidden transition-shadow
        ${isLive ? "border-red-200 shadow-md shadow-red-50" : "border-gray-100 hover:shadow-md"}
        ${effectiveLocked && !isCompleted ? "opacity-75" : ""}
      `}
    >
      {/* Banner */}
      {cls.thumbnailUrl ? (
        <div className="h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cls.thumbnailUrl} alt={cls.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`h-28 flex items-center justify-center ${
          isLive        ? "bg-gradient-to-br from-red-600 to-orange-500"
          : isCompleted ? "bg-gradient-to-br from-gray-300 to-gray-400"
          : effectiveLocked ? "bg-gradient-to-br from-gray-200 to-gray-300"
          : "bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB]"
        }`}>
          {effectiveLocked && !isCompleted ? (
            <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Status + platform */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={cls.liveStatus} isEntitled={cls.isEntitled} />
          <PlatformBadge platform={cls.platform} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2">{cls.title}</h3>

        {/* Faculty */}
        {cls.facultyName && (
          <p className="text-xs text-gray-500">
            {cls.facultyTitle ? `${cls.facultyTitle} ` : ""}{cls.facultyName}
          </p>
        )}

        {/* Date */}
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(cls.sessionDate, cls.startTime, cls.endTime)}
        </p>

        {/* CTA */}
        <div className="pt-1">
          {/* Locked — not entitled */}
          {effectiveLocked && !isCompleted && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Enroll to access this class
            </p>
          )}

          {/* Live — canJoin */}
          {isLive && cls.canJoin && cls.joinUrl && (
            <a
              href={cls.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              Join LIVE Class
            </a>
          )}

          {/* Live — join not ready yet */}
          {isLive && !cls.canJoin && (
            <button disabled className="w-full px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed">
              Preparing join link…
            </button>
          )}

          {/* Upcoming */}
          {isUpcoming && (
            <button disabled className="w-full px-4 py-2.5 rounded-xl bg-blue-50 text-blue-400 text-sm font-semibold cursor-not-allowed">
              Join available closer to class time
            </button>
          )}

          {/* Completed with replay */}
          {isCompleted && cls.replayVideoId && (
            <Link
              href={`/live-classes/${cls.id}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Replay
            </Link>
          )}

          {/* Completed without replay */}
          {isCompleted && !cls.replayVideoId && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 text-center">
              Class completed — replay not available
            </p>
          )}

          {/* View details */}
          {!effectiveLocked && !isCompleted && (
            <Link
              href={`/live-classes/${cls.id}`}
              className="mt-2 flex items-center justify-center gap-1 text-xs text-[#6D4BCB] hover:text-[#5C3DB5] font-medium transition-colors"
            >
              View details
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

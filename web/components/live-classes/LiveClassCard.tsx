"use client";

import Link from "next/link";
import type { LiveStatus } from "@/lib/liveClassDb";

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
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LiveStatus }) {
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
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white leading-none">
        Zoom
      </span>
    );
  }
  if (platform === "YOUTUBE_LIVE") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-600 text-white leading-none">
        YouTube Live
      </span>
    );
  }
  return null;
}

// ── Date/time display ─────────────────────────────────────────────────────────

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
  const isLocked    = cls.liveStatus === "LOCKED";
  const isLive      = cls.liveStatus === "LIVE_NOW";
  const isCompleted = cls.liveStatus === "COMPLETED" || cls.liveStatus === "ENDED";

  return (
    <div
      className={`
        relative bg-white rounded-2xl border overflow-hidden transition-shadow
        ${isLive ? "border-red-200 shadow-md shadow-red-50" : "border-gray-100 hover:shadow-md"}
        ${isLocked ? "opacity-70" : ""}
      `}
    >
      {/* Thumbnail or gradient banner */}
      {cls.thumbnailUrl ? (
        <div className="h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cls.thumbnailUrl}
            alt={cls.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`h-28 flex items-center justify-center ${
            isLive
              ? "bg-gradient-to-br from-red-600 to-orange-500"
              : isCompleted
              ? "bg-gradient-to-br from-gray-300 to-gray-400"
              : "bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB]"
          }`}
        >
          <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Status + platform row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={cls.liveStatus} />
          <PlatformBadge platform={cls.platform} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2">
          {cls.title}
        </h3>

        {/* Faculty */}
        {cls.facultyName && (
          <p className="text-xs text-gray-500">
            {cls.facultyTitle ? `${cls.facultyTitle} ` : ""}
            {cls.facultyName}
          </p>
        )}

        {/* Date / time */}
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(cls.sessionDate, cls.startTime, cls.endTime)}
        </p>

        {/* CTA area */}
        <div className="pt-1">
          {isLocked && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Access restricted — check back later
            </p>
          )}

          {!isLocked && isLive && cls.canJoin && cls.joinUrl && (
            <a
              href={cls.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              Join Class Now
            </a>
          )}

          {!isLocked && isLive && !cls.canJoin && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              This class is live — join link will be visible shortly.
            </p>
          )}

          {!isLocked && cls.liveStatus === "UPCOMING" && (
            <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
              Join link will appear 10 minutes before class starts.
            </p>
          )}

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

          {isCompleted && !cls.replayVideoId && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 text-center">
              Class completed — replay not available
            </p>
          )}

          {/* View details link for upcoming/live (no replay) */}
          {!isLocked && !isCompleted && (
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
  );
}

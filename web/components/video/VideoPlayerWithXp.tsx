"use client";

import { useState, useRef } from "react";
import CourseVideoPlayer from "./CourseVideoPlayer";
import DoubtModal from "./DoubtModal";
import { triggerXpCelebration } from "@/lib/xpCelebration";

export interface XpResult {
  xpAwarded:        number;
  completionNumber: number;
  xpMultiplier:     number;
  newTotal:         number;
}

interface VideoPlayerWithXpProps {
  videoId: string;
  title: string;
  thumbnailUrl?: string | null;
  playbackApiUrl: string;
  courseId?: string;
  xpEnabled: boolean;
  xpValue: number;
  canWatch: boolean;
  isLocked: boolean;
  accessType: string;
  /** Optional callback fired after the completion API responds. */
  onXpAwarded?: (result: XpResult) => void;
}

type XpStatus = "idle" | "loading" | "done" | "error";

export default function VideoPlayerWithXp({
  videoId,
  title,
  thumbnailUrl,
  playbackApiUrl,
  courseId,
  xpEnabled,
  xpValue,
  canWatch,
  isLocked,
  accessType,
  onXpAwarded,
}: VideoPlayerWithXpProps) {
  const [xpStatus, setXpStatus]             = useState<XpStatus>("idle");
  const [xpAwarded, setXpAwarded]           = useState(0);
  const [xpMultiplier, setXpMultiplier]     = useState(0);
  const [xpCompletionNumber, setXpNumber]   = useState(0);
  const [doubtOpen, setDoubtOpen]           = useState(false);
  const [doubtDone, setDoubtDone]           = useState(false);
  const completedRef                        = useRef(false);

  async function handleVideoEnded() {
    if (completedRef.current) return;
    completedRef.current = true;
    setXpStatus("loading");

    try {
      const res = await fetch("/api/student/videos/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      const awarded: number    = data.xpAwarded        ?? 0;
      const multiplier: number = data.xpMultiplier     ?? 0;
      const completion: number = data.completionNumber ?? 0;
      const total: number      = data.newTotal         ?? 0;
      setXpAwarded(awarded);
      setXpMultiplier(multiplier);
      setXpNumber(completion);
      setXpStatus("done");
      if (awarded > 0) triggerXpCelebration();
      onXpAwarded?.({ xpAwarded: awarded, completionNumber: completion, xpMultiplier: multiplier, newTotal: total });
    } catch {
      setXpStatus("error");
    }
  }

  return (
    <>
      {/* Player */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {canWatch ? (
          <CourseVideoPlayer
            title={title}
            posterUrl={thumbnailUrl}
            playbackApiUrl={playbackApiUrl}
            courseId={courseId}
            onEnded={handleVideoEnded}
          />
        ) : isLocked ? (
          <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">Enroll to watch this video</p>
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-white/70">Video not yet available</p>
          </div>
        )}

        {/* Video badges */}
        <div className="px-6 pt-4 flex items-center gap-2 flex-wrap">
          {accessType === "FREE" && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">Free</span>
          )}
          {isLocked && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Enrollment Required
            </span>
          )}
          {xpEnabled && xpValue > 0 && xpStatus === "idle" && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-[#6D4BCB] ring-1 ring-[#6D4BCB]/20">
              ⚡ {xpValue} XP on completion
            </span>
          )}
        </div>

        {/* XP result banner */}
        {xpStatus === "loading" && (
          <div className="mx-6 my-4 bg-purple-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-[#6D4BCB] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-sm text-[#6D4BCB] font-medium">Saving XP…</p>
          </div>
        )}

        {xpStatus === "done" && xpEnabled && (
          <div className="mx-6 my-4 space-y-2">
            {xpAwarded > 0 ? (
              <div className="bg-gradient-to-r from-[#2D1B69] to-[#6D4BCB] rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">
                    {xpCompletionNumber === 2 ? "Video Complete! (50% XP — 2nd watch)" : "Video Complete! XP Earned!"}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">Keep learning to level up!</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">+{xpAwarded}</p>
                  <p className="text-white/70 text-xs">Sadhana Points</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Video Complete! ✓</p>
                {xpCompletionNumber >= 3 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    From the 3rd watch onwards, Sadhana Points (XP) will not be awarded for rewatching. You&apos;ve already earned the maximum XP.
                  </p>
                )}
                {!xpEnabled && (
                  <p className="text-xs text-gray-500 mt-0.5">XP is not configured for this video.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ask a Doubt button — show only when entitled */}
        {canWatch && (
          <div className="px-6 pb-4 mt-1">
            {doubtDone ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5 border border-green-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Doubt submitted! Our mentors will respond soon.
              </div>
            ) : (
              <button
                onClick={() => setDoubtOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-[#6D4BCB] bg-purple-50 hover:bg-purple-100 transition-colors rounded-xl px-4 py-2.5 border border-[#6D4BCB]/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ask a Doubt
              </button>
            )}
          </div>
        )}
      </div>

      {doubtOpen && (
        <DoubtModal
          videoId={videoId}
          videoTitle={title}
          onClose={() => setDoubtOpen(false)}
          onSubmitted={() => {
            setDoubtOpen(false);
            setDoubtDone(true);
          }}
        />
      )}
    </>
  );
}

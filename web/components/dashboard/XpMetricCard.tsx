"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface XpSummary {
  xpTotal: number;
  xpBreakdown: {
    total: number;
    testHub: number;
    flashcards: number;
    ebooks: number;
    pathshala: number;
  };
}

interface XpMetricCardProps {
  initialXpTotal: number;
  initialIsReal: boolean;
}

const XP_SIGNAL_KEY = "xp-last-update";

export default function XpMetricCard({ initialXpTotal, initialIsReal }: XpMetricCardProps) {
  const [xpTotal, setXpTotal] = useState(initialXpTotal);
  const [isReal, setIsReal]   = useState(initialIsReal);
  const [flash, setFlash]     = useState(false);

  // Keep a ref to xpTotal so the refresh callback always compares against the
  // current value without needing xpTotal in its dependency array (which would
  // recreate the callback on every update and break the event listeners).
  const xpTotalRef = useRef(initialXpTotal);
  useEffect(() => { xpTotalRef.current = xpTotal; }, [xpTotal]);

  const applyFlash = useCallback((newTotal: number) => {
    setXpTotal(newTotal);
    setIsReal(newTotal > 0);
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
  }, []);

  const refresh = useCallback(async (trigger = "unknown") => {
    console.log("[XP_CARD_REFRESH_TRIGGERED] trigger=" + trigger);
    try {
      const res = await fetch("/api/student/xp/summary", { cache: "no-store" });
      if (!res.ok) return;
      const data: XpSummary = await res.json();
      console.log("[XP_CARD_REFRESH_TRIGGERED] fetched xpTotal=" + data.xpTotal + " current=" + xpTotalRef.current);
      if (data.xpTotal !== xpTotalRef.current) {
        applyFlash(data.xpTotal);
      }
    } catch { /* silent — stale value stays */ }
  }, [applyFlash]);

  // ── 1. Fetch live value on mount to override any stale SSR data ──────────────
  useEffect(() => {
    refresh("mount");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Same-tab: listen for xp-awarded custom event ─────────────────────────
  //    Fires when VideoPlayerWithXp is on the same page as the dashboard card.
  useEffect(() => {
    function onXpAwarded(e: Event) {
      const ev = e as CustomEvent<{ xpAwarded: number; newTotal: number }>;
      // Update immediately with the value from the API response (no extra fetch needed)
      if (ev.detail.newTotal !== xpTotalRef.current) {
        applyFlash(ev.detail.newTotal);
      }
    }
    window.addEventListener("xp-awarded", onXpAwarded);
    return () => window.removeEventListener("xp-awarded", onXpAwarded);
  }, [applyFlash]);

  // ── 3. Cross-tab: listen for localStorage signal set by VideoPlayerWithXp ───
  //    When the student has the video in one tab and the dashboard in another,
  //    the storage event fires in the dashboard tab → triggers a fresh fetch.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === XP_SIGNAL_KEY) {
        refresh("storage-cross-tab");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  // ── 4. Tab focus: re-fetch when the student navigates back from a video page ─
  useEffect(() => {
    function onFocus() { refresh("window-focus"); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const displayValue = String(xpTotal);
  const subtitle = xpTotal > 0
    ? "Keep learning to earn more"
    : "Complete tests & lessons to earn XP";

  return (
    <div
      className={`bg-white rounded-2xl border p-4 relative overflow-hidden transition-colors duration-500 ${
        flash ? "border-amber-300 bg-amber-50" : "border-gray-100"
      }`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-amber-100 text-amber-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <p
        className={`text-xl font-bold leading-tight transition-all duration-300 ${
          !isReal
            ? "text-[#2D1B69] opacity-50"
            : flash
            ? "text-amber-600 scale-110"
            : "text-[#2D1B69]"
        }`}
      >
        {displayValue}
      </p>
      <p className="text-xs text-gray-400 font-medium mt-0.5">XP Earned</p>
      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{subtitle}</p>
      {!isReal && (
        <span className="absolute top-3 right-3 text-[9px] font-semibold text-gray-300 uppercase tracking-wider">
          Soon
        </span>
      )}
    </div>
  );
}

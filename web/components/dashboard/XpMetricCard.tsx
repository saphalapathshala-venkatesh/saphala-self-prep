"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function XpMetricCard({ initialXpTotal, initialIsReal }: XpMetricCardProps) {
  const [xpTotal, setXpTotal] = useState(initialXpTotal);
  const [isReal, setIsReal]   = useState(initialIsReal);
  const [flash, setFlash]     = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/student/xp/summary");
      if (!res.ok) return;
      const data: XpSummary = await res.json();
      if (data.xpTotal !== xpTotal) {
        setXpTotal(data.xpTotal);
        setIsReal(data.xpTotal > 0);
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
    } catch {
      // silent — stale value stays
    }
  }, [xpTotal]);

  // Fetch live value on mount to override any stale SSR data
  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for XP-awarded event dispatched by VideoPlayerWithXp (same-page scenarios)
  useEffect(() => {
    function onXpAwarded(e: Event) {
      const ev = e as CustomEvent<{ xpAwarded: number; newTotal: number }>;
      if (ev.detail.xpAwarded > 0) {
        setXpTotal(ev.detail.newTotal);
        setIsReal(true);
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
    }
    window.addEventListener("xp-awarded", onXpAwarded);
    return () => window.removeEventListener("xp-awarded", onXpAwarded);
  }, []);

  // Re-fetch when the tab regains focus (student navigated back from a video page)
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const displayValue = String(xpTotal);
  const subtitle = xpTotal > 0
    ? "Keep learning to earn more"
    : "Complete tests & flashcards to earn XP";

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
      <p className={`text-xl font-bold text-[#2D1B69] leading-tight transition-all ${
        !isReal ? "opacity-50" : flash ? "scale-110 text-amber-600" : ""
      }`}>
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

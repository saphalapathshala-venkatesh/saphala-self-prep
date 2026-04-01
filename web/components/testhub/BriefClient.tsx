"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MockTest } from "@/config/testhub";
import ExamInstructionsContent from "./ExamInstructionsContent";
import { langModeLabel, secondaryLangLabel, type LangMode } from "@/lib/langUtils";

interface BriefClientProps {
  test: MockTest;
  backHref?: string;
  backLabel?: string;
}

interface ActiveAttemptInfo {
  attemptId: string;
  language: LangMode;
  attemptNumber: number;
}

export default function BriefClient({ test, backHref = "/testhub", backLabel = "Back to Tests" }: BriefClientProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<LangMode>("EN");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttemptInfo | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [summary, setSummary] = useState<{ bestScore: number | null; latestScore: number | null; lastXp: number | null } | null>(null);

  const attemptsExhausted = attemptsUsed >= test.attemptsAllowed && !activeAttempt;
  const isReattempt = attemptsUsed > 0 && !activeAttempt && !attemptsExhausted;
  const startsOn =
    !activeAttempt &&
    !attemptsExhausted &&
    test.publishedAt != null &&
    new Date(test.publishedAt) > new Date();

  useEffect(() => {
    async function checkActiveAttempt() {
      try {
        const res = await fetch(`/api/testhub/attempts/active?testId=${test.id}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setAttemptsUsed(data.attemptsUsed ?? 0);
          if (data.summary) setSummary(data.summary);
          if (data.activeAttempt) {
            setActiveAttempt(data.activeAttempt);
            setLanguage(data.activeAttempt.language ?? "EN");
          }
        }
        // Non-OK (401, 500, etc.): silently continue — UI shows default start state
      } catch {
        // Network error: silently continue — user can still proceed to start
      } finally {
        setCheckingAttempt(false);
      }
    }
    checkActiveAttempt();
  }, [test.id]);

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/testhub/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ testId: test.id, language }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not start test.");
        setLoading(false);
        return;
      }

      router.push(`/testhub/tests/${test.id}/attempt?lang=${data.language}&aid=${data.attemptId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checkingAttempt) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-2xl w-full p-6 md:p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-gray-400 text-sm">Loading test details...</div>
        </div>
      </div>
    );
  }

  if (startsOn) {
    const startDate = new Date(test.publishedAt!);
    const formatted = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(startDate);
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#2D1B69] mb-3">Test Not Yet Available</h2>
        <p className="text-gray-500 text-sm mb-2">{test.title}</p>
        <p className="text-gray-400 text-sm mb-2">This test opens on</p>
        <p className="text-[#6D4BCB] font-semibold text-base mb-8">{formatted}</p>
        <Link href={backHref} className="btn-glossy-primary px-8 py-3">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (attemptsExhausted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#2D1B69] mb-3">No Attempts Remaining</h2>
        <p className="text-gray-500 text-sm mb-2">{test.title}</p>
        <p className="text-gray-400 text-sm mb-8">
          You have used all {test.attemptsAllowed} attempt{test.attemptsAllowed !== 1 ? "s" : ""} for this test.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={backHref} className="btn-glossy-secondary px-6 py-3">
            {backLabel}
          </Link>
          <Link href={`/testhub/tests/${test.id}/attempts`} className="btn-glossy-primary px-6 py-3">
            View Results
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-2xl w-full p-6 md:p-8">
      <div className="text-center mb-6">
        <span className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
          {test.category} &middot; {test.series}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-[#2D1B69] text-center mb-8">{test.title}</h1>

      {activeAttempt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">You have an ongoing attempt. Resume your test.</p>
            <p className="text-xs text-amber-600 mt-1">
              Attempt #{activeAttempt.attemptNumber} &middot; Language: {langModeLabel(activeAttempt.language)}
            </p>
          </div>
        </div>
      )}

      {!startsOn && attemptsUsed > 0 && summary && (
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-purple-700">Your Progress</span>
            <Link
              href={`/testhub/tests/${test.id}/attempts`}
              className="text-xs text-purple-600 font-medium hover:underline"
            >
              View Attempt History →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-base font-bold text-[#2D1B69]">{attemptsUsed}/{test.attemptsAllowed}</div>
              <div className="text-[10px] text-gray-500">Attempts</div>
            </div>
            <div>
              <div className="text-base font-bold text-green-700">
                {summary.bestScore !== null ? `${summary.bestScore.toFixed(1)}%` : "—"}
              </div>
              <div className="text-[10px] text-gray-500">Best Score</div>
            </div>
            <div>
              <div className="text-base font-bold text-blue-700">
                {summary.latestScore !== null ? `${summary.latestScore.toFixed(1)}%` : "—"}
              </div>
              <div className="text-[10px] text-gray-500">Latest Score</div>
            </div>
            <div>
              <div className="text-base font-bold text-purple-600">
                {summary.lastXp !== null ? `+${summary.lastXp}` : "—"}
              </div>
              <div className="text-[10px] text-gray-500">Last XP</div>
            </div>
          </div>
        </div>
      )}

      <ExamInstructionsContent test={test} attemptsUsed={attemptsUsed} />

      <div className="mt-8 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Language Preference</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LangMode)}
          disabled={!!activeAttempt}
          className="w-full sm:w-48 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="EN">English</option>
          {test.languageAvailable !== "EN" && (
            <option value="TE">{secondaryLangLabel()}</option>
          )}
          {test.languageAvailable === "BOTH" && (
            <option value="BOTH">Bilingual (English + {secondaryLangLabel()})</option>
          )}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          {activeAttempt
            ? "Language is locked for this ongoing attempt."
            : language === "BOTH"
              ? `Both English and ${secondaryLangLabel()} will be shown together for each question.`
              : language === "TE"
                ? `Questions will be shown in ${secondaryLangLabel()}, falling back to English when a translation is unavailable.`
                : "Questions will be shown in English."
          }
        </p>
      </div>

      {!activeAttempt && (
        <div className="mt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-300"
            />
            <span className="text-sm text-gray-700">
              I have read and understood the instructions.
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {isReattempt && !activeAttempt ? (
        <div className="flex gap-4 mt-8">
          <Link
            href={`/testhub/tests/${test.id}/attempts`}
            className="btn-glossy-secondary flex-1 text-center py-3"
          >
            View Results
          </Link>
          <button
            onClick={handleStart}
            disabled={!agreed || loading}
            className="btn-glossy-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Reattempt"}
          </button>
        </div>
      ) : (
        <div className="flex gap-4 mt-8">
          <Link href={backHref} className="btn-glossy-secondary flex-1 text-center py-3">
            {backLabel}
          </Link>
          <button
            onClick={handleStart}
            disabled={(!activeAttempt && !agreed) || loading}
            className="btn-glossy-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Starting..."
              : activeAttempt
                ? "Resume Test"
                : "Start Test"
            }
          </button>
        </div>
      )}
    </div>
  );
}

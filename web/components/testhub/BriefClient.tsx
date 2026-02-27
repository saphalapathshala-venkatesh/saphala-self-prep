"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MockTest } from "@/config/testhub";
import ExamInstructionsContent from "./ExamInstructionsContent";

interface BriefClientProps {
  test: MockTest;
}

interface ActiveAttemptInfo {
  attemptId: string;
  language: "EN" | "TE";
  attemptNumber: number;
}

export default function BriefClient({ test }: BriefClientProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<"EN" | "TE">("EN");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttemptInfo | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [checkingAttempt, setCheckingAttempt] = useState(true);

  const attemptsExhausted = attemptsUsed >= test.attemptsAllowed && !activeAttempt;

  useEffect(() => {
    async function checkActiveAttempt() {
      try {
        const res = await fetch(`/api/testhub/attempts/active?testId=${test.id}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAttemptsUsed(data.attemptsUsed);
          if (data.activeAttempt) {
            setActiveAttempt(data.activeAttempt);
            setLanguage(data.activeAttempt.language);
          }
        }
      } catch {
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
        <Link href="/testhub" className="btn-glossy-primary px-8 py-3">
          Back to Tests
        </Link>
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
              Attempt #{activeAttempt.attemptNumber} &middot; Language: {activeAttempt.language === "EN" ? "English" : "Telugu"}
            </p>
          </div>
        </div>
      )}

      <ExamInstructionsContent test={test} attemptsUsed={attemptsUsed} />

      <div className="mt-8 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Language Preference</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "EN" | "TE")}
          disabled={!!activeAttempt}
          className="w-full sm:w-48 p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="EN">English</option>
          <option value="TE">Telugu</option>
        </select>
        <p className="text-xs text-gray-400 mt-2">
          {activeAttempt
            ? "Language is locked for this ongoing attempt."
            : "Questions will be shown only in the selected language. You can view the other language per question during the test."
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

      <div className="flex gap-4 mt-8">
        <Link href="/testhub" className="btn-glossy-secondary flex-1 text-center py-3">
          Go Back
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
    </div>
  );
}

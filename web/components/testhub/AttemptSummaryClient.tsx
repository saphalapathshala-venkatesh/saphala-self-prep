"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OverallCounts {
  answeredCount: number;
  unattemptedCount: number;
  markedOnlyCount: number;
  answeredAndMarkedCount: number;
  notVisitedCount: number;
}

interface SubjectCounts {
  subjectId: string;
  subjectName: string;
  answered: number;
  unattempted: number;
  markedOnly: number;
  answeredAndMarked: number;
  notVisited: number;
}

interface SummaryData {
  attempt: {
    attemptId: string;
    testId: string;
    submittedAt: string;
    startedAt: string;
    endsAt: string;
    language: string;
  };
  totalQuestions: number;
  durationMinutes: number;
  overall: OverallCounts;
  subjectWise: SubjectCounts[];
}

interface AttemptSummaryClientProps {
  testId: string;
  attemptId: string;
}

export default function AttemptSummaryClient({ testId, attemptId }: AttemptSummaryClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/testhub/attempts/summary?attemptId=${attemptId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Failed to load summary");
          setLoading(false);
          return;
        }
        const d = await res.json();
        setData(d);
        setLoading(false);
      } catch {
        setError("Failed to load summary. Check connection.");
        setLoading(false);
      }
    }
    fetchSummary();
  }, [attemptId]);

  async function handleGenerateResult() {
    setGenerating(true);
    try {
      const res = await fetch("/api/testhub/attempts/generate-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attemptId }),
      });
      if (res.ok) {
        router.push(`/testhub/tests/${testId}/result?attemptId=${attemptId}`);
      } else {
        setGenerating(false);
        setError("Failed to generate result. Please try again.");
      }
    } catch {
      setGenerating(false);
      setError("Failed to generate result. Check connection.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-gray-400 text-sm">Loading summary...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-xl p-8 shadow-sm border text-center max-w-md">
          <p className="text-red-500 mb-4">{error || "Summary not available"}</p>
          <Link href="/testhub" className="btn-glossy-secondary">Back to TestHub</Link>
        </div>
      </div>
    );
  }

  const { overall, subjectWise, totalQuestions, durationMinutes, attempt } = data;

  const startedAt = new Date(attempt.startedAt);
  const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
  const timeUsedMs = submittedAt ? submittedAt.getTime() - startedAt.getTime() : 0;
  const timeUsedMin = Math.floor(timeUsedMs / 60000);
  const timeUsedSec = Math.floor((timeUsedMs % 60000) / 1000);

  const summaryCards = [
    { label: "Answered", count: overall.answeredCount, color: "bg-green-500", textColor: "text-green-600", bgLight: "bg-green-50" },
    { label: "Unattempted", count: overall.unattemptedCount, color: "bg-red-400", textColor: "text-red-500", bgLight: "bg-red-50" },
    { label: "Marked for Review", count: overall.markedOnlyCount, color: "bg-purple-500", textColor: "text-purple-600", bgLight: "bg-purple-50" },
    { label: "Answered & Marked", count: overall.answeredAndMarkedCount, color: "bg-purple-500", textColor: "text-purple-600", bgLight: "bg-purple-50" },
    { label: "Not Visited", count: overall.notVisitedCount, color: "bg-gray-300", textColor: "text-gray-500", bgLight: "bg-gray-50" },
  ];

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#2D1B69]">Attempts Summary</h1>
          <p className="text-xs text-gray-400 mt-1">Marks will be calculated after result generation.</p>
        </div>

        <div className="bg-[#F6F2FF] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-500">Total Questions: </span>
              <span className="font-semibold text-[#2D1B69]">{totalQuestions}</span>
            </div>
            <div>
              <span className="text-gray-500">Time Used: </span>
              <span className="font-semibold text-[#2D1B69]">{timeUsedMin}m {timeUsedSec}s</span>
              <span className="text-gray-400"> / {durationMinutes}m</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {summaryCards.map((card) => (
            <div key={card.label} className={`${card.bgLight} rounded-xl p-3 text-center`}>
              <div className={`text-2xl font-bold ${card.textColor}`}>{card.count}</div>
              <div className="text-[11px] text-gray-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {subjectWise.length > 1 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Subject-wise Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium">Subject</th>
                    <th className="text-center py-2 px-1.5 text-gray-500 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-0.5" />Ans
                    </th>
                    <th className="text-center py-2 px-1.5 text-gray-500 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm bg-red-400 mr-0.5" />Un
                    </th>
                    <th className="text-center py-2 px-1.5 text-gray-500 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm bg-purple-500 mr-0.5" />MR
                    </th>
                    <th className="text-center py-2 px-1.5 text-gray-500 font-medium whitespace-nowrap">
                      <span className="relative inline-block w-2 h-2 rounded-sm bg-purple-500 mr-0.5"><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full" /></span>A+M
                    </th>
                    <th className="text-center py-2 px-1.5 text-gray-500 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm bg-gray-300 mr-0.5" />NV
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjectWise.map((sub) => (
                    <tr key={sub.subjectId} className="border-b border-gray-50">
                      <td className="py-2.5 pr-3 font-medium text-gray-700">{sub.subjectName}</td>
                      <td className="text-center py-2.5 px-1.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-50 text-green-600 text-xs font-semibold">{sub.answered}</span>
                      </td>
                      <td className="text-center py-2.5 px-1.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 text-xs font-semibold">{sub.unattempted}</span>
                      </td>
                      <td className="text-center py-2.5 px-1.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold">{sub.markedOnly}</span>
                      </td>
                      <td className="text-center py-2.5 px-1.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold">{sub.answeredAndMarked}</span>
                      </td>
                      <td className="text-center py-2.5 px-1.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 text-gray-500 text-xs font-semibold">{sub.notVisited}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/testhub" className="btn-glossy-secondary flex-1 text-center py-3">
            Back to Tests
          </Link>
          <button
            onClick={handleGenerateResult}
            disabled={generating}
            className="btn-glossy-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Result"}
          </button>
        </div>
      </div>
    </div>
  );
}

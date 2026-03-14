"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface SerializedAttempt {
  id: string;
  testId: string;
  testTitle: string;
  category: string | null;
  accessType: "FREE" | "LOCKED";
  status: "IN_PROGRESS" | "SUBMITTED";
  attemptNumber: number;
  language: string;
  startedAt: string;
  submittedAt: string | null;
  endsAt: string | null;
  scorePct: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  isScored: boolean;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
}

function formatShortDate(s: string | null): string {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
}

function ScoreBadge({ row }: { row: SerializedAttempt }) {
  if (!row.isScored) {
    return <span className="text-xs text-gray-400 italic">Score pending</span>;
  }
  const total = row.correctCount + row.wrongCount + row.unansweredCount;
  const pct = total > 0 ? Math.round((row.correctCount / total) * 100) : 0;
  const color =
    pct >= 70
      ? "text-green-700 bg-green-50 border-green-200"
      : pct >= 40
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${color}`}>
      {row.correctCount}/{total} &middot; {pct}%
    </span>
  );
}

function AttemptCard({ row }: { row: SerializedAttempt }) {
  const isActive = row.status === "IN_PROGRESS";
  const expired = row.endsAt ? new Date(row.endsAt) < new Date() : false;
  const resumable = isActive && !expired;

  return (
    <div
      className={`bg-white rounded-xl border p-4 sm:p-5 transition-shadow hover:shadow-sm ${
        resumable ? "border-amber-200 bg-amber-50/30" : "border-gray-100"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {resumable ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              In Progress
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Completed
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#2D1B69] leading-snug">{row.testTitle}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {row.category && (
              <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {row.category}
              </span>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: row.accessType === "FREE" ? "#f0fdf4" : "#f5f3ff",
                color: row.accessType === "FREE" ? "#166534" : "#5b21b6",
              }}
            >
              {row.accessType === "FREE" ? "Free" : "Paid"}
            </span>
            <span className="text-xs text-gray-400">
              Attempt #{row.attemptNumber}
            </span>
            <span className="text-xs text-gray-400 capitalize">
              {row.language === "TE" ? "Telugu" : "English"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {resumable
              ? `Started: ${formatDate(row.startedAt)}`
              : `Submitted: ${formatShortDate(row.submittedAt)}`}
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
          <ScoreBadge row={row} />
          <div className="flex gap-2">
            {resumable ? (
              <Link
                href={`/testhub/tests/${row.testId}/attempt`}
                className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Resume
              </Link>
            ) : (
              <>
                <Link
                  href={`/testhub/tests/${row.testId}/review?attemptId=${row.id}`}
                  className="text-xs font-semibold text-[#6D4BCB] border border-[#6D4BCB] hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Review
                </Link>
                <Link
                  href={`/testhub/tests/${row.testId}/result?attemptId=${row.id}`}
                  className="text-xs font-semibold text-white bg-[#6D4BCB] hover:bg-[#5C3DB5] px-3 py-1.5 rounded-lg transition-colors"
                >
                  Result
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const selectClass =
  "text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-purple-300 outline-none cursor-pointer min-w-[130px]";
const labelClass = "text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1";

export default function AttemptsClient({ attempts }: { attempts: SerializedAttempt[] }) {
  const [category, setCategory] = useState("all");
  const [testType, setTestType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(attempts.map((a) => a.category).filter(Boolean))) as string[],
    [attempts]
  );

  const filtered = useMemo(() => {
    const now = new Date();
    return attempts.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (testType === "free" && a.accessType !== "FREE") return false;
      if (testType === "paid" && a.accessType !== "LOCKED") return false;
      if (status === "completed" && a.status !== "SUBMITTED") return false;
      if (
        status === "inprogress" &&
        (a.status !== "IN_PROGRESS" || (a.endsAt && new Date(a.endsAt) < now))
      )
        return false;

      const started = new Date(a.startedAt);
      if (dateRange === "7d") {
        if (started < new Date(now.getTime() - 7 * 86400000)) return false;
      } else if (dateRange === "30d") {
        if (started < new Date(now.getTime() - 30 * 86400000)) return false;
      } else if (dateRange === "90d") {
        if (started < new Date(now.getTime() - 90 * 86400000)) return false;
      } else if (dateRange === "custom") {
        if (customStart && started < new Date(customStart)) return false;
        if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          if (started > end) return false;
        }
      }
      return true;
    });
  }, [attempts, category, testType, status, dateRange, customStart, customEnd]);

  const inProgress = filtered.filter(
    (a) => a.status === "IN_PROGRESS" && a.endsAt && new Date(a.endsAt) > new Date()
  );
  const submitted = filtered.filter((a) => a.status === "SUBMITTED");
  const expired = filtered.filter(
    (a) => a.status === "IN_PROGRESS" && (!a.endsAt || new Date(a.endsAt) <= new Date())
  );

  const totalSubmitted = attempts.filter((a) => a.status === "SUBMITTED").length;
  const totalInProgress = attempts.filter(
    (a) => a.status === "IN_PROGRESS" && a.endsAt && new Date(a.endsAt) > new Date()
  ).length;
  const scoredAttempts = attempts.filter((a) => a.status === "SUBMITTED" && a.isScored);
  const avgAccuracy =
    scoredAttempts.length > 0
      ? Math.round(
          (scoredAttempts.reduce((s, a) => {
            const total = a.correctCount + a.wrongCount + a.unansweredCount;
            return s + (total > 0 ? a.correctCount / total : 0);
          }, 0) /
            scoredAttempts.length) *
            100
        )
      : null;

  const isFiltered =
    category !== "all" ||
    testType !== "all" ||
    status !== "all" ||
    dateRange !== "all";

  return (
    <>
      <section className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-gray-400 hover:text-[#6D4BCB] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-[#2D1B69]">My Attempts</h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">Your complete test attempt history</p>

          {attempts.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4 ml-8">
              <div className="text-center">
                <p className="text-lg font-bold text-[#2D1B69]">{totalSubmitted}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Completed</p>
              </div>
              {totalInProgress > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">{totalInProgress}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">In Progress</p>
                </div>
              )}
              {avgAccuracy !== null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-[#6D4BCB]">{avgAccuracy}%</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg Accuracy</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {attempts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-600 mb-2">No attempts yet</p>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              Your test history will show up here after your first attempt.
            </p>
            <Link
              href="/testhub"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#6D4BCB] hover:bg-[#5C3DB5] px-5 py-2.5 rounded-xl transition-colors"
            >
              Start a Free Test
            </Link>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap gap-4 items-end">
                {categories.length > 0 && (
                  <div>
                    <div className={labelClass}>Category</div>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className={labelClass}>Test Type</div>
                  <select value={testType} onChange={(e) => setTestType(e.target.value)} className={selectClass}>
                    <option value="all">All</option>
                    <option value="free">Free Tests</option>
                    <option value="paid">Paid Tests</option>
                  </select>
                </div>

                <div>
                  <div className={labelClass}>Status</div>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="inprogress">In Progress</option>
                  </select>
                </div>

                <div>
                  <div className={labelClass}>Date Range</div>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {dateRange === "custom" && (
                  <>
                    <div>
                      <div className={labelClass}>Start Date</div>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className={selectClass}
                      />
                    </div>
                    <div>
                      <div className={labelClass}>End Date</div>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className={selectClass}
                      />
                    </div>
                  </>
                )}

                {isFiltered && (
                  <button
                    onClick={() => {
                      setCategory("all");
                      setTestType("all");
                      setStatus("all");
                      setDateRange("all");
                      setCustomStart("");
                      setCustomEnd("");
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors pb-0.5"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {isFiltered && (
                <p className="text-xs text-gray-400 mt-3">
                  Showing {filtered.length} of {attempts.length} attempts
                </p>
              )}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-500 mb-1">No results match your filters</p>
                <p className="text-xs text-gray-400">Try adjusting or clearing the filters above.</p>
              </div>
            )}

            {inProgress.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  In Progress
                </h2>
                <div className="space-y-3">
                  {inProgress.map((row) => (
                    <AttemptCard key={row.id} row={row} />
                  ))}
                </div>
              </section>
            )}

            {submitted.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Completed ({submitted.length})
                </h2>
                <div className="space-y-3">
                  {submitted.map((row) => (
                    <AttemptCard key={row.id} row={row} />
                  ))}
                </div>
              </section>
            )}

            {expired.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Expired / Not Submitted
                </h2>
                <div className="space-y-3">
                  {expired.map((row) => (
                    <div
                      key={row.id}
                      className="bg-gray-50 rounded-xl border border-gray-100 p-4 sm:p-5 opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wide flex-shrink-0 mt-0.5">
                          Expired
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-500 truncate">{row.testTitle}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Started: {formatShortDate(row.startedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

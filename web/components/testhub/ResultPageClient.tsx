'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Trophy, Target, Clock, TrendingUp, Star, X, Award, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface SubjectBreakdown {
  subjectId: string;
  subjectName: string;
  grossMarks: number;
  negativeMarks: number;
  netMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeUsedMs: number;
}

interface Top10Entry {
  displayName: string;
  netMarks: number;
  accuracyPercent: number;
  timeUsedMs: number;
}

interface XpBreakdown {
  attemptNumber: number;
  baseXP: number;
  bonusXP: number;
  xpMultiplier: number;
}

interface ResultData {
  resultId: string;
  testTitle: string;
  testCode: string;
  totalQuestions: number;
  maxMarks: number;
  durationMinutes: number;
  showLeaderboard: boolean;
  totals: {
    grossMarksTotal: number;
    negativeMarksTotal: number;
    netMarksTotal: number;
    accuracyPercent: number;
    totalTimeUsedMs: number;
  };
  subjectBreakdown: SubjectBreakdown[];
  rank: number | null;
  percentile: number | null;
  xpEarned: number;
  xpBreakdown?: XpBreakdown;
  totalXp: number;
  top10: Top10Entry[];
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fireConfetti() {
  import('canvas-confetti').then((mod) => {
    const confetti = mod.default;
    const saphalaColors = ['#6D4BCB', '#2D1B69', '#5E3FB8', '#4CAF50', '#38A169', '#7C3AED'];
    const end = Date.now() + 3000;

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: saphalaColors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: saphalaColors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }
    frame();
  });
}

export default function ResultPageClient({ attemptId, testId }: { attemptId: string; testId: string }) {
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState(false);
  const confettiTriggered = useRef(false);

  const fetchResult = useCallback(async () => {
    const res = await fetch(`/api/testhub/attempts/result?attemptId=${attemptId}`);
    if (res.status === 404) {
      const genRes = await fetch('/api/testhub/attempts/generate-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'Failed to generate result');
      }
      const fetchAgain = await fetch(`/api/testhub/attempts/result?attemptId=${attemptId}`);
      if (!fetchAgain.ok) throw new Error('Failed to fetch result after generation');
      return fetchAgain.json();
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch result');
    }
    return res.json();
  }, [attemptId]);

  useEffect(() => {
    fetchResult()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [fetchResult]);

  useEffect(() => {
    if (data && showOverlay && !confettiTriggered.current) {
      confettiTriggered.current = true;
      fireConfetti();
    }
  }, [data, showOverlay]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Generating your result...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full p-8 text-center">
          <p className="text-red-500 mb-4">{error || 'Something went wrong'}</p>
          <Link href="/testhub" className="btn-glossy-primary px-8 py-3">Back to TestHub</Link>
        </div>
      </div>
    );
  }

  if (showOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-8 relative animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => setShowOverlay(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 mx-auto mb-4 flex items-center justify-center">
              <Star size={32} className="text-white" fill="white" />
            </div>
            <h2 className="text-xl font-bold text-[#2D1B69] mb-1">XP Earned!</h2>
            {data.xpBreakdown && (
              <span className="inline-block text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                Attempt #{data.xpBreakdown.attemptNumber}
              </span>
            )}
          </div>

          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 text-center border border-purple-200">
              <div className="text-xs text-purple-600 font-medium mb-2 uppercase tracking-wide">This Test</div>
              <div className="text-3xl font-bold text-[#2D1B69]">+{data.xpEarned}</div>
              <div className="text-xs text-purple-500 mt-1">XP</div>
            </div>
            <div className="flex-1 bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 text-center border border-green-200">
              <div className="text-xs text-green-600 font-medium mb-2 uppercase tracking-wide">Total XP</div>
              <div className="text-3xl font-bold text-green-700 break-all min-w-0">{data.totalXp.toLocaleString()}</div>
              <div className="text-xs text-green-500 mt-1">XP</div>
            </div>
          </div>

          {data.xpBreakdown && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-5 text-center">
              <div className="text-sm font-medium text-[#2D1B69]">
                {data.xpBreakdown.xpMultiplier === 1 && "First attempt — you earned full XP!"}
                {data.xpBreakdown.xpMultiplier === 0.5 && "Reattempt — you earned 50% of the base XP."}
                {data.xpBreakdown.xpMultiplier === 0 && "XP is not awarded from the third attempt onward."}
              </div>
              {data.xpBreakdown.xpMultiplier > 0 && (data.xpBreakdown.baseXP > 0 || data.xpBreakdown.bonusXP > 0) && (
                <div className="text-xs text-purple-500 mt-1">
                  {data.xpBreakdown.baseXP} base
                  {data.xpBreakdown.bonusXP > 0 ? ` + ${data.xpBreakdown.bonusXP} accuracy bonus` : ""}
                  {data.xpBreakdown.xpMultiplier === 0.5 ? " × 50%" : ""}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mb-6">
            {data.xpBreakdown?.xpMultiplier === 0
              ? "Keep practising — accuracy and consistency are what matter most."
              : "Well done — your effort is building real exam confidence."}
          </p>

          <button
            onClick={() => setShowOverlay(false)}
            className="w-full btn-glossy-primary py-3 text-sm font-semibold"
          >
            View Full Result
          </button>
        </div>
      </div>
    );
  }

  const { totals, subjectBreakdown, showLeaderboard, top10 } = data;

  return (
    <div className="flex-grow py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#2D1B69]">{data.testTitle}</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">{data.testCode}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-purple-50 mx-auto mb-2 flex items-center justify-center">
              <Trophy size={18} className="text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-[#2D1B69]">{totals.netMarksTotal}</div>
            <div className="text-xs text-gray-500">Net Marks</div>
            <div className="text-[10px] text-gray-400 mt-0.5">out of {data.maxMarks}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-green-50 mx-auto mb-2 flex items-center justify-center">
              <Target size={18} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">{totals.accuracyPercent}%</div>
            <div className="text-xs text-gray-500">Accuracy</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 mx-auto mb-2 flex items-center justify-center">
              <Clock size={18} className="text-blue-600" />
            </div>
            <div className="text-lg font-bold text-blue-700">{formatTime(totals.totalTimeUsedMs)}</div>
            <div className="text-xs text-gray-500">Time Used</div>
            <div className="text-[10px] text-gray-400 mt-0.5">of {data.durationMinutes}m</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#2D1B69] mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Marks Breakdown
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{totals.grossMarksTotal}</div>
              <div className="text-xs text-gray-500">Gross Marks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">-{totals.negativeMarksTotal}</div>
              <div className="text-xs text-gray-500">Negative Marks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#2D1B69]">{totals.netMarksTotal}</div>
              <div className="text-xs text-gray-500">Net Marks</div>
            </div>
          </div>
        </div>

        {data.xpBreakdown && (
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-5 mb-6">
            <h2 className="text-sm font-semibold text-[#2D1B69] mb-3 flex items-center gap-2">
              <Star size={16} className="text-purple-500" /> XP Summary
            </h2>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Attempt #{data.xpBreakdown.attemptNumber}</div>
                <div className="text-xs text-purple-700 bg-white border border-purple-100 rounded-lg px-3 py-1.5">
                  {data.xpBreakdown.xpMultiplier === 1 && "1st attempt — full XP awarded"}
                  {data.xpBreakdown.xpMultiplier === 0.5 && "2nd attempt — 50% XP awarded"}
                  {data.xpBreakdown.xpMultiplier === 0 && "3rd+ attempt — no XP awarded"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#2D1B69]">+{data.xpEarned}</div>
                <div className="text-xs text-purple-500">XP</div>
              </div>
            </div>
            {data.xpBreakdown.xpMultiplier > 0 && (data.xpBreakdown.baseXP > 0 || data.xpBreakdown.bonusXP > 0) && (
              <div className="text-xs text-gray-500">
                {data.xpBreakdown.baseXP} base XP
                {data.xpBreakdown.bonusXP > 0 && ` + ${data.xpBreakdown.bonusXP} accuracy bonus`}
                {data.xpBreakdown.xpMultiplier === 0.5 && " × 50%"}
              </div>
            )}
          </div>
        )}

        {subjectBreakdown.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
            <button
              onClick={() => setExpandedSubjects(!expandedSubjects)}
              className="w-full flex items-center justify-between text-sm font-semibold text-[#2D1B69]"
            >
              <span>Subject-wise Breakdown</span>
              {expandedSubjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSubjects && (
              <div className="mt-4 space-y-3">
                {subjectBreakdown.map((sub) => (
                  <div key={sub.subjectId} className="border border-gray-100 rounded-lg p-4">
                    <div className="font-medium text-gray-700 text-sm mb-3">{sub.subjectName}</div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <div className="text-sm font-semibold text-green-600">{sub.grossMarks}</div>
                        <div className="text-[10px] text-gray-400">Gross</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-red-500">-{sub.negativeMarks}</div>
                        <div className="text-[10px] text-gray-400">Negative</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#2D1B69]">{sub.netMarks}</div>
                        <div className="text-[10px] text-gray-400">Net</div>
                      </div>
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />{sub.correctCount} correct
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400" />{sub.incorrectCount} wrong
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />{sub.unattemptedCount} skipped
                      </span>
                      <span className="ml-auto">{formatTime(sub.timeUsedMs)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subjectBreakdown.length === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Question Analysis</h2>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />{subjectBreakdown[0].correctCount} Correct
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />{subjectBreakdown[0].incorrectCount} Incorrect
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />{subjectBreakdown[0].unattemptedCount} Unattempted
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#2D1B69] mb-4 flex items-center gap-2">
            <Award size={16} /> Rank & Percentile
          </h2>
          {showLeaderboard ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center bg-purple-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-[#2D1B69]">#{data.rank}</div>
                  <div className="text-xs text-gray-500">Your Rank</div>
                </div>
                <div className="text-center bg-purple-50 rounded-xl p-4 relative">
                  <div className="text-2xl font-bold text-[#2D1B69]">{data.percentile}</div>
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    Percentile
                    <button
                      onClick={() => setShowTooltip(!showTooltip)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  {showTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[11px] rounded-lg p-3 w-56 z-10 shadow-lg">
                      Percentile {data.percentile} means you performed better than {data.percentile}% learners who attempted this test.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
                    </div>
                  )}
                </div>
              </div>

              {top10.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top 10 Performers</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 text-xs">
                          <th className="text-left py-2 pr-2">#</th>
                          <th className="text-left py-2 pr-2">Name</th>
                          <th className="text-right py-2 px-2">Score</th>
                          <th className="text-right py-2 px-2">Acc%</th>
                          <th className="text-right py-2 pl-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top10.map((entry, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                            <td className="py-2 pr-2 font-medium text-gray-700">{entry.displayName}</td>
                            <td className="py-2 px-2 text-right font-semibold">{entry.netMarks}</td>
                            <td className="py-2 px-2 text-right text-gray-600">{entry.accuracyPercent}%</td>
                            <td className="py-2 pl-2 text-right text-gray-500 text-xs">{formatTime(entry.timeUsedMs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                <Award size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                Rank & percentile will appear once more learners attempt this test.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-3">
          <Link
            href={`/testhub/tests/${testId}/review?attemptId=${attemptId}`}
            className="flex-1 text-center py-3 border-2 border-[#6D4BCB] text-[#6D4BCB] rounded-xl font-semibold text-sm hover:bg-purple-50 transition-colors"
          >
            Review Questions
          </Link>
          <Link
            href="/testhub"
            className="flex-1 text-center btn-glossy-primary py-3 text-sm font-semibold"
          >
            Back to Series
          </Link>
        </div>
        <Link
          href={`/testhub/tests/${testId}/attempts`}
          className="block text-center text-sm text-purple-600 font-medium hover:underline mb-8"
        >
          View Attempt History →
        </Link>
      </div>
    </div>
  );
}

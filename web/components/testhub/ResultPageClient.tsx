'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy, Target, Clock, TrendingUp, Star, X, Award, ChevronDown, ChevronUp,
  Info, Zap, BarChart2, Lightbulb, Users
} from 'lucide-react';
import { triggerXpCelebration } from '@/lib/xpCelebration';
import XpEarnedBadge from '@/components/shared/XpEarnedBadge';

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
  rank: number;
  displayName: string;
  netMarks: number;
  accuracyPercent: number;
  examTimeMs: number;
}

interface XpBreakdown {
  attemptNumber: number;
  baseXP: number;
  bonusXP: number;
  xpMultiplier: number;
}

interface Topper {
  marks: number;
  accuracy: number;
  examTimeMs: number;
}

interface ResultData {
  resultId: string;
  testTitle: string;
  testCode: string;
  totalQuestions: number;
  maxMarks: number;
  durationMinutes: number;
  showLeaderboard: boolean;
  totalFirstAttempts: number;
  totals: {
    grossMarksTotal: number;
    negativeMarksTotal: number;
    netMarksTotal: number;
    accuracyPercent: number;
    totalExamTimeMs: number;
  };
  subjectBreakdown: SubjectBreakdown[];
  rank: number | null;
  percentile: number | null;
  topper: Topper | null;
  cohortAvgTimeMs: number | null;
  xpEarned: number;
  xpBreakdown?: XpBreakdown;
  totalXp: number;
  top10: Top10Entry[];
}

interface TaxoBucket {
  key: string;
  level: 'subtopic' | 'topic' | 'subject' | 'general';
  label: string;
  subjectName: string;
  topicName: string | null;
  subtopicName: string | null;
}

interface AccuracyBucket extends TaxoBucket {
  total: number;
  correct: number;
  wrong: number;
  unattempted: number;
  attempted: number;
  accuracyPct: number;
  color: string;
  status: string;
  meaning: string;
}

interface TimeBucket extends TaxoBucket {
  learnerAvgTimeMs: number;
  cohortAvgTimeMs: number;
  ratio: number;
  color: string;
  status: string;
}

interface RiskMap {
  correctEfficient: number;
  correctSlow: number;
  wrongRushed: number;
  wrongHeavy: number;
  unattempted: number;
  total: number;
  limitedSamples: boolean;
}

interface FocusArea extends TaxoBucket {
  accuracyPct: number;
  unattemptedPct: number;
  timeStatus: string;
  focusScore: number;
  priority: string;
  action: string;
}

interface AnalyticsData {
  accuracyHeatMap: AccuracyBucket[];
  timeHeatMap: TimeBucket[] | null;
  riskHeatMap: RiskMap;
  focusAreas: FocusArea[];
  suggestions: string[];
  meta: {
    totalFirstAttempts: number;
    hasSufficientTimeSamples: boolean;
    learnerExamTimeMs: number;
    cohortAvgTimeMs: number;
  };
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function AccuracyColorBar({ color, pct }: { color: string; pct: number }) {
  const cls: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    orange: 'bg-orange-400',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  };
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1.5">
      <div className={`h-2 rounded-full ${cls[color] ?? 'bg-gray-300'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls: Record<string, string> = {
    'High Priority': 'bg-red-100 text-red-700',
    'Moderate Priority': 'bg-orange-100 text-orange-700',
    'Low Priority': 'bg-yellow-100 text-yellow-700',
    'Strong Area': 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls[priority] ?? 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  );
}

function TimeColorDot({ color }: { color: string }) {
  const cls: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-400', red: 'bg-red-500' };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls[color] ?? 'bg-gray-400'}`} />;
}

export default function ResultPageClient({ attemptId, testId }: { attemptId: string; testId: string }) {
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'report' | 'suggestions'>('summary');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const confettiTriggered = useRef(false);

  const fetchResult = useCallback(async () => {
    const res = await fetch(`/api/testhub/attempts/result?attemptId=${attemptId}`);
    if (res.status === 401) throw new Error("Session expired. Please log in again.");
    if (res.status === 404) {
      const genRes = await fetch('/api/testhub/attempts/generate-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate result');
      }
      const fetchAgain = await fetch(`/api/testhub/attempts/result?attemptId=${attemptId}`);
      if (!fetchAgain.ok) {
        const err2 = await fetchAgain.json().catch(() => ({}));
        throw new Error(err2.error || 'Failed to fetch result after generation');
      }
      return fetchAgain.json();
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch result (${res.status})`);
    }
    return res.json();
  }, [attemptId]);

  const fetchAnalytics = useCallback(async () => {
    if (analytics || analyticsLoading) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch(`/api/testhub/attempts/analytics?attemptId=${attemptId}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      const d = await res.json();
      setAnalytics(d);
    } catch (e: unknown) {
      setAnalyticsError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [attemptId, analytics, analyticsLoading]);

  useEffect(() => {
    fetchResult()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [fetchResult]);

  useEffect(() => {
    if (data && showOverlay && !confettiTriggered.current) {
      confettiTriggered.current = true;
      triggerXpCelebration();
    }
  }, [data, showOverlay]);

  useEffect(() => {
    if (!showOverlay && (activeTab === 'report' || activeTab === 'suggestions')) {
      fetchAnalytics();
    }
  }, [activeTab, showOverlay, fetchAnalytics]);

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
    const isThirdPlusAttempt = data.xpBreakdown?.xpMultiplier === 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-8 relative animate-in fade-in zoom-in duration-300">
          <button onClick={() => setShowOverlay(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 mx-auto mb-4 flex items-center justify-center">
              <Star size={32} className="text-white" fill="white" />
            </div>
            <h2 className="text-xl font-bold text-[#2D1B69] mb-1">
              {isThirdPlusAttempt ? "Test Complete!" : "XP Earned!"}
            </h2>
            {data.xpBreakdown && (
              <span className="inline-block text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                Attempt #{data.xpBreakdown.attemptNumber}
              </span>
            )}
          </div>

          {isThirdPlusAttempt ? (
            <div className="flex flex-col gap-3 mb-6">
              <div className="rounded-xl px-4 py-4 flex items-start gap-3" style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}>
                <span className="text-2xl leading-none mt-0.5">🏆</span>
                <div>
                  <p className="text-sm font-bold text-orange-800 mb-1">No Sadhana Points for this attempt</p>
                  <p className="text-xs text-orange-700 leading-relaxed">From the 3rd attempt onwards, Sadhana Points (XP) will not be allocated. You've already earned the maximum XP for this content.</p>
                </div>
              </div>
              <div className="rounded-xl px-4 py-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #2D1B69 0%, #6D4BCB 100%)" }}>
                <span className="text-2xl leading-none mt-0.5">🌟</span>
                <div>
                  <p className="text-sm font-bold text-white mb-1">Keep up the good effort!</p>
                  <p className="text-xs text-purple-200 leading-relaxed">With every effort you are moving closer to your dream. Consistent revision is what separates toppers from the rest — keep going!</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-3">
                <XpEarnedBadge xp={data.xpEarned} label="Earned This Test" />
                <div className="flex items-center justify-between bg-gradient-to-br from-green-50 to-green-100 rounded-xl px-4 py-3 border border-green-200">
                  <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Total XP</div>
                  <div className="text-xl font-bold text-green-700">{data.totalXp.toLocaleString()} <span className="text-sm font-medium">XP</span></div>
                </div>
              </div>
              {data.xpBreakdown && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-5 text-center">
                  <div className="text-sm font-medium text-[#2D1B69]">
                    {data.xpBreakdown.xpMultiplier === 1 && "First attempt — you earned full XP!"}
                    {data.xpBreakdown.xpMultiplier === 0.5 && "Reattempt — you earned 50% of the base XP."}
                  </div>
                  {(data.xpBreakdown.baseXP > 0 || data.xpBreakdown.bonusXP > 0) && (
                    <div className="text-xs text-purple-500 mt-1">
                      {data.xpBreakdown.baseXP} base
                      {data.xpBreakdown.bonusXP > 0 ? ` + ${data.xpBreakdown.bonusXP} accuracy bonus` : ""}
                      {data.xpBreakdown.xpMultiplier === 0.5 ? " × 50%" : ""}
                    </div>
                  )}
                </div>
              )}
              <p className="text-center text-sm text-gray-500 mb-6">Well done — your effort is building real exam confidence.</p>
            </>
          )}
          <button onClick={() => setShowOverlay(false)} className="w-full btn-glossy-primary py-3 text-sm font-semibold">
            View Full Result
          </button>
        </div>
      </div>
    );
  }

  const { totals, subjectBreakdown, showLeaderboard, top10 } = data;

  return (
    <div className="flex-grow py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[#2D1B69]">{data.testTitle}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{data.testCode}</p>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {([
            { key: 'summary', icon: Trophy, label: 'Summary' },
            { key: 'report', icon: BarChart2, label: 'Full Report' },
            { key: 'suggestions', icon: Lightbulb, label: 'Suggestions' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-white text-[#2D1B69] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && (
          <>
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
                <div className="text-lg font-bold text-blue-700">{formatTime(totals.totalExamTimeMs)}</div>
                <div className="text-xs text-gray-500">Exam Time</div>
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
                  <div className="text-xs text-gray-500">Negative</div>
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
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{sub.correctCount} correct</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{sub.incorrectCount} wrong</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />{sub.unattemptedCount} skipped</span>
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
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />{subjectBreakdown[0].correctCount} Correct</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />{subjectBreakdown[0].incorrectCount} Incorrect</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" />{subjectBreakdown[0].unattemptedCount} Unattempted</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
              <h2 className="text-sm font-semibold text-[#2D1B69] mb-4 flex items-center gap-2">
                <Award size={16} /> Rank & Percentile
              </h2>
              {showLeaderboard ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center bg-purple-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#2D1B69]">#{data.rank}</div>
                      <div className="text-xs text-gray-500">Your Rank</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">among {data.totalFirstAttempts} learners</div>
                    </div>
                    <div className="text-center bg-purple-50 rounded-xl p-4 relative">
                      <div className="text-2xl font-bold text-[#2D1B69]">{data.percentile}</div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        Percentile
                        <button onClick={() => setShowTooltip(!showTooltip)} className="text-gray-400 hover:text-gray-600">
                          <Info size={12} />
                        </button>
                      </div>
                      {showTooltip && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[11px] rounded-lg p-3 w-56 z-10 shadow-lg">
                          Percentile {data.percentile} means you scored better than {data.percentile}% of learners who attempted this test (first attempts only).
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
                        </div>
                      )}
                    </div>
                  </div>

                  {data.topper && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Trophy size={12} className="text-amber-600" /> Topper Comparison
                      </h3>
                      <div className="grid grid-cols-3 gap-3 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-gray-400 mb-1">Marks</div>
                          <div className="font-bold text-amber-700">{data.topper.marks} <span className="text-gray-400 font-normal">Topper</span></div>
                          <div className="font-semibold text-gray-700">{totals.netMarksTotal} <span className="text-gray-400 font-normal">You</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-1">Accuracy</div>
                          <div className="font-bold text-amber-700">{data.topper.accuracy}% <span className="text-gray-400 font-normal">Topper</span></div>
                          <div className="font-semibold text-gray-700">{totals.accuracyPercent}% <span className="text-gray-400 font-normal">You</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-1">Exam Time</div>
                          <div className="font-bold text-amber-700">{formatTime(data.topper.examTimeMs)} <span className="text-gray-400 font-normal">Topper</span></div>
                          <div className="font-semibold text-gray-700">{formatTime(totals.totalExamTimeMs)} <span className="text-gray-400 font-normal">You</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {top10.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Users size={12} /> Top 10 Performers (First Attempts Only)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400 text-xs">
                              <th className="text-left py-2 pr-2">#</th>
                              <th className="text-left py-2 pr-2">Learner</th>
                              <th className="text-right py-2 px-2">Marks</th>
                              <th className="text-right py-2 px-2">Acc%</th>
                              <th className="text-right py-2 pl-2">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {top10.map((entry) => (
                              <tr key={entry.rank} className={`border-b border-gray-50 ${data.rank === entry.rank ? 'bg-purple-50' : ''}`}>
                                <td className="py-2 pr-2">
                                  {entry.rank <= 3 ? (
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${entry.rank === 1 ? 'bg-yellow-400 text-white' : entry.rank === 2 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-white'}`}>
                                      {entry.rank}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">{entry.rank}</span>
                                  )}
                                </td>
                                <td className="py-2 pr-2 font-medium text-gray-700 text-xs">
                                  {entry.displayName}
                                  {data.rank === entry.rank && <span className="ml-1 text-purple-600 text-[10px]">(You)</span>}
                                </td>
                                <td className="py-2 px-2 text-right font-semibold text-xs">{entry.netMarks}</td>
                                <td className="py-2 px-2 text-right text-gray-600 text-xs">{entry.accuracyPercent}%</td>
                                <td className="py-2 pl-2 text-right text-gray-500 text-xs">{formatTime(entry.examTimeMs)}</td>
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
                    Rank & percentile will appear once {Math.max(0, 5 - (data.totalFirstAttempts ?? 0))} more learner{Math.max(0, 5 - (data.totalFirstAttempts ?? 0)) !== 1 ? 's' : ''} attempt this test.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{data.totalFirstAttempts ?? 0} first attempt{(data.totalFirstAttempts ?? 0) !== 1 ? 's' : ''} recorded so far.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mb-3">
              <Link href={`/testhub/tests/${testId}/review?attemptId=${attemptId}`} className="flex-1 text-center py-3 border-2 border-[#6D4BCB] text-[#6D4BCB] rounded-xl font-semibold text-sm hover:bg-purple-50 transition-colors">
                Review Questions
              </Link>
              <Link href="/testhub" className="flex-1 text-center btn-glossy-primary py-3 text-sm font-semibold">
                Back to Series
              </Link>
            </div>
            <Link href={`/testhub/tests/${testId}/attempts`} className="block text-center text-sm text-purple-600 font-medium hover:underline mb-8">
              View Attempt History →
            </Link>
          </>
        )}

        {(activeTab === 'report' || activeTab === 'suggestions') && (
          <>
            {analyticsLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading your analysis...</p>
                </div>
              </div>
            )}
            {analyticsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm text-red-600">{analyticsError}</p>
                <button onClick={fetchAnalytics} className="mt-2 text-xs text-red-500 underline">Try again</button>
              </div>
            )}

            {analytics && activeTab === 'report' && (
              <div className="space-y-5 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-[#2D1B69] mb-1 flex items-center gap-2">
                    <BarChart2 size={16} /> Accuracy Heat Map
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">How accurately you performed in each area. Grouped by the most specific level available (subtopic → topic → subject).</p>
                  <div className="space-y-4">
                    {analytics.accuracyHeatMap.map((s) => (
                      <div key={s.key}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-700">{s.label}</span>
                            {(s.topicName || s.subtopicName) && (
                              <div className="text-[10px] text-gray-400 truncate">
                                {[s.subjectName, s.topicName, s.level === 'subtopic' ? null : null].filter(Boolean).join(' › ')}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                            s.color === 'green' ? 'bg-green-100 text-green-700' :
                            s.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            s.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                            s.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                          }`}>{s.attempted === 0 ? 'Not Attempted' : `${s.accuracyPct}% — ${s.status}`}</span>
                        </div>
                        <AccuracyColorBar color={s.color} pct={s.accuracyPct} />
                        <p className="text-[11px] text-gray-400 mt-1">{s.meaning}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400">
                          <th className="text-left py-1.5 pr-2">Area</th>
                          <th className="text-right py-1.5 px-2">Total</th>
                          <th className="text-right py-1.5 px-2">Correct</th>
                          <th className="text-right py-1.5 px-2">Wrong</th>
                          <th className="text-right py-1.5 px-2">Skipped</th>
                          <th className="text-right py-1.5 pl-2">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.accuracyHeatMap.map((s) => (
                          <tr key={s.key} className="border-b border-gray-50">
                            <td className="py-1.5 pr-2 font-medium text-gray-700">
                              <div>{s.label}</div>
                              {s.level !== 'subject' && s.level !== 'general' && (
                                <div className="text-[10px] text-gray-400">{s.subjectName}{s.topicName && s.level === 'subtopic' ? ` › ${s.topicName}` : ''}</div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right text-gray-500">{s.total}</td>
                            <td className="py-1.5 px-2 text-right text-green-600 font-medium">{s.correct}</td>
                            <td className="py-1.5 px-2 text-right text-red-500 font-medium">{s.wrong}</td>
                            <td className="py-1.5 px-2 text-right text-gray-400">{s.unattempted}</td>
                            <td className="py-1.5 pl-2 text-right font-semibold text-gray-700">{s.attempted === 0 ? '—' : `${s.accuracyPct}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {analytics.timeHeatMap && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-[#2D1B69] mb-1 flex items-center gap-2">
                      <Clock size={16} /> Time Efficiency Map
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">How your average time per question compares to other learners (first attempts only).</p>
                    <div className="space-y-3">
                      {analytics.timeHeatMap.map((s) => (
                        <div key={s.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <TimeColorDot color={s.color} />
                          <div className="flex-grow min-w-0">
                            <div className="text-sm font-medium text-gray-700">{s.label}</div>
                            {s.level !== 'subject' && s.level !== 'general' && (
                              <div className="text-[10px] text-gray-400">{s.subjectName}{s.topicName && s.level === 'subtopic' ? ` › ${s.topicName}` : ''}</div>
                            )}
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              You: {formatTime(s.learnerAvgTimeMs)}/q · Avg: {formatTime(s.cohortAvgTimeMs)}/q
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                            s.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            s.color === 'green' ? 'bg-green-100 text-green-700' :
                            s.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>{s.status}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400">
                            <th className="text-left py-1.5 pr-2">Area</th>
                            <th className="text-right py-1.5 px-2">Your time/q</th>
                            <th className="text-right py-1.5 px-2">Avg time/q</th>
                            <th className="text-right py-1.5 px-2">Ratio</th>
                            <th className="text-right py-1.5 pl-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.timeHeatMap.map((s) => (
                            <tr key={s.key} className="border-b border-gray-50">
                              <td className="py-1.5 pr-2 font-medium text-gray-700">
                                <div>{s.label}</div>
                                {s.level !== 'subject' && s.level !== 'general' && (
                                  <div className="text-[10px] text-gray-400">{s.subjectName}{s.topicName && s.level === 'subtopic' ? ` › ${s.topicName}` : ''}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-600">{formatTime(s.learnerAvgTimeMs)}</td>
                              <td className="py-1.5 px-2 text-right text-gray-400">{s.cohortAvgTimeMs > 0 ? formatTime(s.cohortAvgTimeMs) : '—'}</td>
                              <td className="py-1.5 px-2 text-right text-gray-600">{s.cohortAvgTimeMs > 0 ? `${Math.round(s.ratio * 100)}%` : '—'}</td>
                              <td className={`py-1.5 pl-2 text-right font-semibold text-xs ${
                                s.color === 'blue' ? 'text-blue-600' : s.color === 'green' ? 'text-green-600' : s.color === 'orange' ? 'text-orange-500' : 'text-red-500'
                              }`}>{s.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!analytics.riskHeatMap.limitedSamples && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-[#2D1B69] mb-1 flex items-center gap-2">
                      <Zap size={16} /> Question Behaviour Map
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">How you handled each question — correctly, incorrectly, or skipped.</p>
                    <div className="space-y-3 mb-5">
                      {[
                        { label: 'Correct & Efficient', value: analytics.riskHeatMap.correctEfficient, color: 'bg-green-500', meaning: 'Got it right and within time. Excellent.' },
                        { label: 'Correct but Slow', value: analytics.riskHeatMap.correctSlow, color: 'bg-yellow-400', meaning: 'Right answer, but took longer than average. Practice speed.' },
                        { label: 'Rushed Error', value: analytics.riskHeatMap.wrongRushed, color: 'bg-orange-400', meaning: 'Answered quickly but incorrectly. Slow down and read carefully.' },
                        { label: 'Time-Heavy Mistake', value: analytics.riskHeatMap.wrongHeavy, color: 'bg-red-500', meaning: 'Spent too long and still got it wrong. Move on faster next time.' },
                        { label: 'Unattempted', value: analytics.riskHeatMap.unattempted, color: 'bg-gray-300', meaning: 'Left blank. Work on confidence and time management.' },
                      ].map(({ label, value, color, meaning }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${color}`} />
                          <div className="flex-grow">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 font-medium">{label}</span>
                              <span className="text-sm font-bold text-gray-700">{value}</span>
                            </div>
                            <p className="text-[11px] text-gray-400">{meaning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400">
                            <th className="text-left py-1.5 pr-2">Behaviour Type</th>
                            <th className="text-right py-1.5 px-2">Count</th>
                            <th className="text-right py-1.5 pl-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { type: 'Correct & Efficient', count: analytics.riskHeatMap.correctEfficient, action: 'Keep it up' },
                            { type: 'Correct but Slow', count: analytics.riskHeatMap.correctSlow, action: 'Improve speed' },
                            { type: 'Rushed Error', count: analytics.riskHeatMap.wrongRushed, action: 'Slow down' },
                            { type: 'Time-Heavy Mistake', count: analytics.riskHeatMap.wrongHeavy, action: 'Move on faster' },
                            { type: 'Unattempted', count: analytics.riskHeatMap.unattempted, action: 'Build confidence' },
                          ].map(({ type, count, action }) => (
                            <tr key={type} className="border-b border-gray-50">
                              <td className="py-1.5 pr-2 font-medium text-gray-700">{type}</td>
                              <td className="py-1.5 px-2 text-right font-semibold text-gray-700">{count}</td>
                              <td className="py-1.5 pl-2 text-right text-gray-500">{action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-[#2D1B69] mb-1 flex items-center gap-2">
                    <Target size={16} /> Focus Area Analysis
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">Areas ranked by how much attention they need (accuracy, time, and mistakes combined).</p>
                  <div className="space-y-3">
                    {analytics.focusAreas.map((fa) => (
                      <div key={fa.key} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0">
                            <span className="font-medium text-gray-700 text-sm">{fa.label}</span>
                            {fa.level !== 'subject' && fa.level !== 'general' && (
                              <div className="text-[10px] text-gray-400">{fa.subjectName}{fa.topicName && fa.level === 'subtopic' ? ` › ${fa.topicName}` : ''}</div>
                            )}
                          </div>
                          <PriorityBadge priority={fa.priority} />
                        </div>
                        <div className="flex gap-3 text-[11px] text-gray-500 mb-2 flex-wrap">
                          <span>Accuracy: <strong>{fa.accuracyPct}%</strong></span>
                          <span>Skipped: <strong>{fa.unattemptedPct}%</strong></span>
                          <span>Focus score: <strong>{fa.focusScore}/100</strong></span>
                        </div>
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{fa.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {analytics.meta.learnerExamTimeMs > 0 && analytics.meta.cohortAvgTimeMs > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-[#2D1B69] mb-4 flex items-center gap-2">
                      <Clock size={16} /> Time Analysis
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-blue-50 rounded-xl p-4">
                        <div className="text-xl font-bold text-blue-700">{formatTime(analytics.meta.learnerExamTimeMs)}</div>
                        <div className="text-xs text-gray-500 mt-1">Your Exam Time</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-xl p-4">
                        <div className="text-xl font-bold text-gray-700">{formatTime(analytics.meta.cohortAvgTimeMs)}</div>
                        <div className="text-xs text-gray-500 mt-1">Average (All Learners)</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-3">
                      Based on {analytics.meta.totalFirstAttempts} first attempt{analytics.meta.totalFirstAttempts !== 1 ? 's' : ''}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {analytics && activeTab === 'suggestions' && (
              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] rounded-2xl p-5 text-white mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb size={18} className="text-yellow-300" />
                    <h2 className="font-bold text-base">Saphala Mentor Suggestions</h2>
                  </div>
                  <p className="text-xs text-purple-200">Personalised insights based on your performance in this test.</p>
                </div>

                {analytics.suggestions.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-500">Great performance! No critical improvement areas found.</p>
                    <p className="text-xs text-gray-400 mt-1">More detailed suggestions will appear as more learners attempt this test.</p>
                  </div>
                )}

                {analytics.suggestions.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border border-purple-100 p-4 flex gap-3 shadow-sm">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-purple-700">{i + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
                  </div>
                ))}

                {!analytics.meta.hasSufficientTimeSamples && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-700">
                      <strong>Note:</strong> Some time-based suggestions need more learners to attempt this test first. They will become available automatically as more students take the test.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

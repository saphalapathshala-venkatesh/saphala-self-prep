'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Flag, Star, ChevronDown, ChevronUp, X, MessageSquare } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface OptionData {
  key: string;
  text: string;
}

interface ReviewSection {
  id: string;
  title: string;
  sortOrder: number;
}

interface ReviewQuestion {
  questionId: string;
  order: number;
  sectionId: string | null;
  subjectName: string;
  questionText_en: string;
  questionText_te: string;
  groupId: string | null;
  paragraphHtml: string | null;
  options_en: OptionData[];
  options_te: OptionData[];
  correctOption: string;
  explanation_en: string;
  explanation_te: string;
  userSelectedOption: string | null;
  isMarkedForReview: boolean;
  timeSpentMs: number;
  avgTimeMs: number | null;
  limitedSample: boolean;
  validAttemptsCount: number;
  behaviorTag: string | null;
}

interface ReviewData {
  testMeta: {
    id: string;
    name: string;
    code: string;
    totalQuestions: number;
    marksPerQuestion: number;
    negativeMarks: number;
  };
  attemptMeta: {
    attemptId: string;
    language: "EN" | "TE";
    submittedAt: string;
  };
  sections: ReviewSection[];
  questions: ReviewQuestion[];
}

function formatTimeShort(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function getPaceLabel(timeMs: number, avgMs: number): { label: string; color: string } {
  const ratio = timeMs / avgMs;
  if (ratio <= 0.75) return { label: "Very Fast", color: "text-blue-600 bg-blue-50" };
  if (ratio <= 1.15) return { label: "Ideal", color: "text-green-600 bg-green-50" };
  if (ratio <= 1.5) return { label: "Slower than avg", color: "text-orange-600 bg-orange-50" };
  return { label: "Much Slower", color: "text-red-600 bg-red-50" };
}

const BEHAVIOR_TAG_STYLES: Record<string, string> = {
  "Efficient Solve": "bg-green-100 text-green-700",
  "Correct but Slow": "bg-yellow-100 text-yellow-700",
  "Rushed Error": "bg-orange-100 text-orange-700",
  "Time-Heavy Mistake": "bg-red-100 text-red-700",
};

const ISSUE_TYPES = [
  { value: "incorrect_answer_key", label: "Incorrect answer key" },
  { value: "question_unclear", label: "Question unclear" },
  { value: "translation_issue", label: "Translation issue" },
  { value: "explanation_issue", label: "Explanation issue" },
  { value: "other", label: "Other" },
];

export default function ReviewClient({ attemptId, testId }: { attemptId: string; testId: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showAltLang, setShowAltLang] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportType, setReportType] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [filter, setFilter] = useState<"all" | "incorrect" | "unattempted">("all");

  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    if (filter === "incorrect") {
      return data.questions.filter(
        (q) => q.userSelectedOption !== null && q.userSelectedOption !== q.correctOption
      );
    }
    if (filter === "unattempted") {
      return data.questions.filter((q) => q.userSelectedOption === null);
    }
    return data.questions;
  }, [data, filter]);

  const sortedSections = useMemo(() => {
    if (!data) return [];
    return [...data.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data]);

  const sectionOrderMap = useMemo(() => {
    if (!data) return new Map<string, number>();
    return new Map(data.sections.map((s) => [s.id, s.sortOrder]));
  }, [data]);

  const sectionSortedFilteredQuestions = useMemo(() => {
    return [...filteredQuestions].sort((a, b) => {
      const sA = a.sectionId ? (sectionOrderMap.get(a.sectionId) ?? 999) : 999;
      const sB = b.sectionId ? (sectionOrderMap.get(b.sectionId) ?? 999) : 999;
      if (sA !== sB) return sA - sB;
      return a.order - b.order;
    });
  }, [filteredQuestions, sectionOrderMap]);

  function switchFilter(f: "all" | "incorrect" | "unattempted") {
    setFilter(f);
    setShowAltLang(false);
    setPaletteOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToQuestion(questionId: string) {
    const el = questionRefs.current.get(questionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPaletteOpen(false);
  }

  const fetchReview = useCallback(async () => {
    const res = await fetch(`/api/testhub/attempts/review?attemptId=${attemptId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Session expired. Please log in again.");
      if (res.status === 403) throw new Error("You do not have access to this review.");
      if (res.status === 404) throw new Error("Review not found. The attempt may not have been submitted yet.");
      throw new Error(err.error || `Failed to load review (${res.status})`);
    }
    return res.json();
  }, [attemptId]);

  useEffect(() => {
    fetchReview()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [fetchReview]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const counts = useMemo(() => {
    const qs = data?.questions ?? [];
    let correct = 0, incorrect = 0, unattempted = 0;
    for (const q of qs) {
      if (q.userSelectedOption === null) unattempted++;
      else if (q.userSelectedOption === q.correctOption) correct++;
      else incorrect++;
    }
    return { correct, incorrect, unattempted };
  }, [data]);

  async function handleReport() {
    if (!reportType || !activeReportId) return;
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/testhub/questions/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId: activeReportId,
          issueType: reportType,
          message: reportMessage,
        }),
      });
      if (res.ok) {
        setToast("Thank you. Our team will review this question.");
        setActiveReportId(null);
        setReportType("");
        setReportMessage("");
      }
    } catch {
      setToast("Failed to submit report. Try again.");
    }
    setReportSubmitting(false);
  }

  async function handleFeedback() {
    if (feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    try {
      const res = await fetch('/api/testhub/attempts/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, rating: feedbackRating, comment: feedbackComment }),
      });
      if (res.ok) {
        setFeedbackDone(true);
        setToast("Thanks for your feedback!");
      }
    } catch {
      setToast("Failed to submit feedback. Try again.");
    }
    setFeedbackSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-20">
        <div className="animate-pulse text-gray-400">Loading review...</div>
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

  const { testMeta, attemptMeta } = data;
  const primaryLang = attemptMeta.language;
  const altLang = primaryLang === "EN" ? "TE" : "EN";
  const hasSections = sortedSections.length > 0;
  const hasQuestions = sectionSortedFilteredQuestions.length > 0;

  const reportQ = activeReportId ? data.questions.find((q) => q.questionId === activeReportId) : null;

  function paletteButton(q: ReviewQuestion) {
    let color: string;
    if (q.userSelectedOption === null) color = "bg-gray-200 text-gray-600";
    else if (q.userSelectedOption === q.correctOption) color = "bg-green-500 text-white";
    else color = "bg-red-400 text-white";
    return (
      <button
        key={q.questionId}
        onClick={() => scrollToQuestion(q.questionId)}
        className={`w-10 h-10 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${color}`}
      >
        {q.order + 1}
      </button>
    );
  }

  const paletteContent = (
    <div>
      <div className="space-y-1.5 text-[11px] font-medium mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
            <span className="text-gray-500">Correct ({counts.correct})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
            <span className="text-gray-500">Incorrect ({counts.incorrect})</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
            <span className="text-gray-500">Unattempted ({counts.unattempted})</span>
          </div>
        </div>
      </div>

      {hasSections ? (
        <div className="space-y-4">
          {sortedSections.map((sec) => {
            const secQs = sectionSortedFilteredQuestions.filter((q) => q.sectionId === sec.id);
            if (secQs.length === 0) return null;
            return (
              <div key={sec.id}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {sec.title}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {secQs.map((q) => paletteButton(q))}
                </div>
              </div>
            );
          })}
          {(() => {
            const unsectioned = sectionSortedFilteredQuestions.filter((q) => !q.sectionId);
            if (unsectioned.length === 0) return null;
            return (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">General</p>
                <div className="grid grid-cols-5 gap-2">
                  {unsectioned.map((q) => paletteButton(q))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {sectionSortedFilteredQuestions.map((q) => paletteButton(q))}
        </div>
      )}
    </div>
  );

  function renderQuestionCard(q: ReviewQuestion, sectionTitle: string | null) {
    const qIsAttempted = q.userSelectedOption !== null;
    const qIsCorrect = q.userSelectedOption === q.correctOption;
    const qText = primaryLang === "TE" ? q.questionText_te : q.questionText_en;
    const altQText = primaryLang === "TE" ? q.questionText_en : q.questionText_te;
    const opts = primaryLang === "TE" ? q.options_te : q.options_en;
    const altOpts = primaryLang === "TE" ? q.options_en : q.options_te;
    const expl = primaryLang === "TE" ? q.explanation_te : q.explanation_en;

    return (
      <div
        key={q.questionId}
        ref={(el) => {
          if (el) questionRefs.current.set(q.questionId, el);
          else questionRefs.current.delete(q.questionId);
        }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 mb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              Q{q.order + 1}
            </span>
            {sectionTitle && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{sectionTitle}</span>
            )}
            <span className="text-[10px] text-gray-400">{q.subjectName}</span>
          </div>
          <span className="text-xs text-gray-400">+{testMeta.marksPerQuestion} / -{testMeta.negativeMarks}</span>
        </div>

        {qIsAttempted ? (
          <div className={`flex items-center gap-2 mb-3 text-xs font-medium px-3 py-1.5 rounded-lg w-fit ${qIsCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {qIsCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {qIsCorrect ? "Correct" : "Incorrect"}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-xs font-medium px-3 py-1.5 rounded-lg w-fit bg-gray-50 text-gray-500">
            Unattempted
          </div>
        )}

        {q.paragraphHtml && (
          <div className="question-paragraph">
            <div className="question-paragraph-label">Passage</div>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.paragraphHtml) }} />
          </div>
        )}

        <div
          className="text-[15px] text-gray-800 leading-relaxed mb-6"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(qText ?? "") }}
        />

        <div className="space-y-3 mb-4">
          {opts.map((opt) => {
            const isUserSelected = q.userSelectedOption === opt.key;
            const isCorrectOpt = q.correctOption === opt.key;
            let borderClass = "border-gray-150 bg-white";
            let badgeClass = "bg-gray-100 text-gray-600";
            let icon = null;
            if (isCorrectOpt) {
              borderClass = "border-green-300 bg-green-50/50";
              badgeClass = "bg-green-500 text-white";
              icon = <CheckCircle2 size={16} className="text-green-600 ml-auto flex-shrink-0" />;
            } else if (isUserSelected && !isCorrectOpt) {
              borderClass = "border-red-300 bg-red-50/50";
              badgeClass = "bg-red-400 text-white";
              icon = <XCircle size={16} className="text-red-500 ml-auto flex-shrink-0" />;
            }
            return (
              <div
                key={opt.key}
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm flex items-center ${borderClass}`}
              >
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mr-3 flex-shrink-0 ${badgeClass}`}>
                  {opt.key}
                </span>
                <span
                  className="flex-grow"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text) }}
                />
                {icon}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShowAltLang(!showAltLang)}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 mb-4"
        >
          {showAltLang ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          View {altLang === "TE" ? "Telugu" : "English"}
        </button>

        {showAltLang && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
            <div
              className="text-sm text-gray-700 leading-relaxed mb-3"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(altQText ?? "") }}
            />
            <div className="space-y-2">
              {altOpts.map((opt) => (
                <div key={opt.key} className="text-sm text-gray-600 flex items-baseline gap-2">
                  <span className="font-medium flex-shrink-0">{opt.key}.</span>
                  <span
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text) }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-100">
          <p className="text-xs font-semibold text-purple-700 mb-2">Explanation</p>
          <div
            className="text-sm text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(expl ?? "") }}
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Timing Insight</span>
            </div>
            {q.behaviorTag && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BEHAVIOR_TAG_STYLES[q.behaviorTag] ?? 'bg-gray-100 text-gray-500'}`}>
                {q.behaviorTag}
              </span>
            )}
          </div>
          {q.avgTimeMs !== null ? (
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div>
                <span className="text-gray-500">You: </span>
                <span className="font-semibold text-gray-700">{formatTimeShort(q.timeSpentMs)}</span>
              </div>
              <div>
                <span className="text-gray-500">Avg{q.limitedSample ? '*' : ''}: </span>
                <span className="font-semibold text-gray-700">{formatTimeShort(q.avgTimeMs)}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPaceLabel(q.timeSpentMs, q.avgTimeMs).color}`}>
                {getPaceLabel(q.timeSpentMs, q.avgTimeMs).label}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Timing insights will appear after more learners attempt this test.</p>
          )}
          {q.limitedSample && q.avgTimeMs !== null && (
            <p className="text-[10px] text-gray-400 mt-1.5">* Average based on limited attempts ({q.validAttemptsCount}). Will improve as more students take the test.</p>
          )}
        </div>

        <button
          onClick={() => { setActiveReportId(q.questionId); setReportType(""); setReportMessage(""); }}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <Flag size={12} /> Report an Issue
        </button>
      </div>
    );
  }

  const filterTabs: Array<{ key: "all" | "incorrect" | "unattempted"; label: string; count: number }> = [
    { key: "all", label: "All", count: data.questions.length },
    { key: "incorrect", label: "Incorrect", count: counts.incorrect },
    { key: "unattempted", label: "Unattempted", count: counts.unattempted },
  ];

  return (
    <>
      <div className="bg-[#2D1B69] text-white py-2.5 px-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{testMeta.name}</h1>
            <p className="text-[10px] text-purple-200">{testMeta.code} — Review</p>
          </div>
          <Link
            href={`/testhub/tests/${testId}/result?attemptId=${attemptId}`}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Back to Result
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-6">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchFilter(tab.key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.key
                  ? "border-[#6D4BCB] text-[#6D4BCB]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow flex max-w-7xl mx-auto w-full">
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">

          {!hasQuestions && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 mb-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-500" />
              </div>
              <p className="text-gray-500 text-sm">No questions in this category.</p>
              <p className="text-gray-400 text-xs mt-1">Great work!</p>
            </div>
          )}

          {hasQuestions && hasSections && (
            <div>
              {sortedSections.map((sec) => {
                const secQs = sectionSortedFilteredQuestions.filter((q) => q.sectionId === sec.id);
                if (secQs.length === 0) return null;
                return (
                  <div key={sec.id} className="mb-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-grow bg-gray-200" />
                      <h2 className="text-xs font-bold text-[#2D1B69] uppercase tracking-wider px-3 py-1.5 bg-purple-50 rounded-full border border-purple-100 flex-shrink-0">
                        {sec.title}
                      </h2>
                      <div className="h-px flex-grow bg-gray-200" />
                    </div>
                    {secQs.map((q) => renderQuestionCard(q, sec.title))}
                  </div>
                );
              })}
              {(() => {
                const unsectioned = sectionSortedFilteredQuestions.filter((q) => !q.sectionId);
                if (unsectioned.length === 0) return null;
                return unsectioned.map((q) => renderQuestionCard(q, null));
              })()}
            </div>
          )}

          {hasQuestions && !hasSections && (
            <div>
              {sectionSortedFilteredQuestions.map((q) => renderQuestionCard(q, null))}
            </div>
          )}

          <div className="md:hidden mt-4 mb-4">
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm"
            >
              <span className="font-medium text-gray-700">Question Palette</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />{counts.correct}</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />{counts.incorrect}</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />{counts.unattempted}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${paletteOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {paletteOpen && (
              <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4">
                {paletteContent}
              </div>
            )}
          </div>

          {hasQuestions && !feedbackDone && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-purple-600" />
                <h3 className="text-sm font-semibold text-[#2D1B69]">Your Feedback</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Your valuable feedback helps us improve overall product experience.</p>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeedbackRating(s)}
                    className="p-1 transition-colors"
                  >
                    <Star
                      size={24}
                      className={s <= feedbackRating ? "text-yellow-400" : "text-gray-200"}
                      fill={s <= feedbackRating ? "#FACC15" : "none"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share your thoughts (optional)"
                className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 mb-3"
                rows={3}
              />
              <button
                onClick={handleFeedback}
                disabled={feedbackRating === 0 || feedbackSubmitting}
                className="btn-glossy-primary px-6 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          )}

          {hasQuestions && feedbackDone && (
            <div className="bg-green-50 rounded-xl border border-green-100 p-5 mb-4 text-center">
              <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-700 font-medium">Thanks for your feedback!</p>
            </div>
          )}
        </div>

        <div className="hidden md:block w-64 flex-shrink-0 border-l border-gray-200 bg-white p-4 sticky top-0 h-screen overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Question Palette</h3>
          {paletteContent}
        </div>
      </div>

      {activeReportId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4" onClick={() => setActiveReportId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2D1B69]">Report an Issue</h3>
              <button onClick={() => setActiveReportId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Question {reportQ ? reportQ.order + 1 : ""}</p>
            <div className="space-y-2 mb-4">
              {ISSUE_TYPES.map((it) => (
                <label key={it.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="issueType"
                    value={it.value}
                    checked={reportType === it.value}
                    onChange={(e) => setReportType(e.target.value)}
                    className="accent-purple-600"
                  />
                  {it.label}
                </label>
              ))}
            </div>
            <textarea
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              placeholder="Additional details (optional)"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setActiveReportId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportType || reportSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {reportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

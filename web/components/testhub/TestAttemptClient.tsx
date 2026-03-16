"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import InstructionsPill from "./InstructionsPill";
import type { MockTest } from "@/config/testhub";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubsectionMeta {
  id: string;
  title: string;
  sortOrder: number;
  durationSec: number | null;
  questionCount: number;
}

interface SectionMeta {
  id: string;
  title: string;
  sortOrder: number;
  durationSec: number | null;
  questionCount: number;
  subsections: SubsectionMeta[];
}

interface TestConfig {
  id: string;
  name: string;
  code: string;
  durationSec: number | null;
  totalQuestions: number;
  negativeMarking: number;
  marksPerQuestion: number;
  pauseAllowed: boolean;
  sectionsEnabled: boolean;
  subsectionsEnabled: boolean;
  timerMode: "TOTAL" | "SECTION" | "SUBSECTION";
  strictSectionMode: boolean;
}

interface AttemptMeta {
  attemptId: string;
  language: "EN" | "TE";
  endsAt: string;
  status: string;
}

interface QuestionData {
  id: string;
  order: number;
  sectionId: string | null;
  questionText_en: string;
  questionText_te: string;
  optionA_en: string;
  optionA_te: string;
  optionB_en: string;
  optionB_te: string;
  optionC_en: string;
  optionC_te: string;
  optionD_en: string;
  optionD_te: string;
}

interface SavedAnswer {
  questionId: string;
  selectedOption: string | null;
  isMarkedForReview: boolean;
  timeSpentMs: number;
}

interface QuestionState {
  visited: boolean;
  draftOption: string | null;
  savedOption: string | null;
  isMarkedForReview: boolean;
  timeSpentMs: number;
}

interface TestAttemptClientProps {
  testId: string;
  test: MockTest;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestAttemptClient({ testId, test }: TestAttemptClientProps) {
  const router = useRouter();

  // Load state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Core data
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);
  const [attemptMeta, setAttemptMeta] = useState<AttemptMeta | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [questionStates, setQuestionStates] = useState<Map<string, QuestionState>>(new Map());

  // Navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Timers
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
  const sectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionEnteredAt = useRef<number>(Date.now());

  // Save / submit
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // UI
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Pause
  const [pausing, setPausing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  const questionStartTime = useRef<number>(Date.now());
  const autoSubmitTriggered = useRef(false);

  // ── Initial data load ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/testhub/tests/${testId}/attempt-data`, {
          credentials: "include",
        });
        if (res.status === 401) { setSessionExpired(true); setLoading(false); return; }
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}));
          setError(
            data.code === "ATTEMPT_LOCKED"
              ? data.error || "This test is already open on another device."
              : data.error || "Failed to load test data"
          );
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to load test data");
          setLoading(false);
          return;
        }

        const data = await res.json();

        const cfg: TestConfig = {
          id: data.test.id,
          name: data.test.name,
          code: data.test.code,
          durationSec: data.test.durationSec ?? null,
          totalQuestions: data.test.totalQuestions,
          negativeMarking: data.test.negativeMarking,
          marksPerQuestion: data.test.marksPerQuestion,
          pauseAllowed: data.test.pauseAllowed ?? false,
          sectionsEnabled: data.test.sectionsEnabled ?? false,
          subsectionsEnabled: data.test.subsectionsEnabled ?? false,
          timerMode: data.test.timerMode ?? "TOTAL",
          strictSectionMode: data.test.strictSectionMode ?? false,
        };

        setTestConfig(cfg);
        setAttemptMeta(data.attempt);
        setQuestions(data.questions ?? []);
        setSections(data.sections ?? []);

        const states = new Map<string, QuestionState>();
        for (const q of data.questions ?? []) {
          const saved = (data.savedAnswers ?? []).find((a: SavedAnswer) => a.questionId === q.id);
          states.set(q.id, {
            visited: !!saved,
            draftOption: saved?.selectedOption ?? null,
            savedOption: saved?.selectedOption ?? null,
            isMarkedForReview: saved?.isMarkedForReview ?? false,
            timeSpentMs: saved?.timeSpentMs ?? 0,
          });
        }
        if (data.questions?.length > 0) {
          const first = states.get(data.questions[0].id);
          if (first) first.visited = true;
          setCurrentSectionId(data.questions[0].sectionId ?? null);
        }
        setQuestionStates(states);

        const endsAt = new Date(data.attempt.endsAt).getTime();
        setTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
        setLoading(false);
      } catch {
        setError("Failed to load test data. Please check your connection.");
        setLoading(false);
      }
    }
    fetchData();
  }, [testId]);

  // ── Total timer ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (timeLeft <= 0 || !attemptMeta || isPaused) return;
    const interval = setInterval(() => {
      const endsAt = new Date(attemptMeta.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !autoSubmitTriggered.current) {
        autoSubmitTriggered.current = true;
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [attemptMeta, isPaused]);

  // ── Section timer ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);

    if (!testConfig?.sectionsEnabled || testConfig.timerMode === "TOTAL" || !currentSectionId || isPaused) {
      setSectionTimeLeft(null);
      return;
    }

    const section = sections.find((s) => s.id === currentSectionId);
    if (!section?.durationSec) { setSectionTimeLeft(null); return; }

    // Reset to full section duration when entering a new section
    sectionEnteredAt.current = Date.now();
    let remaining = section.durationSec;
    setSectionTimeLeft(remaining);

    sectionTimerRef.current = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      setSectionTimeLeft(remaining);
      if (remaining <= 0 && sectionTimerRef.current) {
        clearInterval(sectionTimerRef.current);
      }
    }, 1000);

    return () => {
      if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
    };
  }, [currentSectionId, testConfig?.sectionsEnabled, testConfig?.timerMode, isPaused, sections]);

  // ── Time recording ─────────────────────────────────────────────────────────

  const recordTimeForCurrent = useCallback(() => {
    if (questions.length === 0) return;
    const qId = questions[currentIndex].id;
    const delta = Date.now() - questionStartTime.current;
    questionStartTime.current = Date.now();
    setQuestionStates((prev) => {
      const next = new Map(prev);
      const state = { ...next.get(qId)! };
      state.timeSpentMs += delta;
      next.set(qId, state);
      return next;
    });
    return { qId, delta };
  }, [currentIndex, questions]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigateTo(index: number) {
    if (index === currentIndex || index < 0 || index >= questions.length) return;
    recordTimeForCurrent();
    const nextQ = questions[index];
    const nextSectionId = nextQ.sectionId ?? null;

    setCurrentIndex(index);
    questionStartTime.current = Date.now();

    if (nextSectionId !== currentSectionId) {
      setCurrentSectionId(nextSectionId);
    }

    setQuestionStates((prev) => {
      const next = new Map(prev);
      const state = { ...next.get(nextQ.id)! };
      state.visited = true;
      next.set(nextQ.id, state);
      return next;
    });
  }

  function navigateToSection(sectionId: string) {
    const idx = questions.findIndex((q) => q.sectionId === sectionId);
    if (idx >= 0) navigateTo(idx);
  }

  // ── Answer operations ──────────────────────────────────────────────────────

  function selectOption(option: string) {
    const qId = questions[currentIndex].id;
    setQuestionStates((prev) => {
      const next = new Map(prev);
      const state = { ...next.get(qId)! };
      state.draftOption = state.draftOption === option ? null : option;
      next.set(qId, state);
      return next;
    });
  }

  function clearResponse() {
    const qId = questions[currentIndex].id;
    setQuestionStates((prev) => {
      const next = new Map(prev);
      const state = { ...next.get(qId)! };
      state.draftOption = null;
      state.savedOption = null;
      state.isMarkedForReview = false;
      next.set(qId, state);
      return next;
    });
  }

  async function saveAnswer(markForReview: boolean) {
    if (!attemptMeta || saving) return;
    setSaving(true);
    setSaveError(null);

    const qId = questions[currentIndex].id;
    const timeInfo = recordTimeForCurrent();
    const state = questionStates.get(qId)!;

    try {
      const res = await fetch("/api/testhub/attempts/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attemptId: attemptMeta.attemptId,
          questionId: qId,
          selectedOption: state.draftOption,
          isMarkedForReview: markForReview,
          timeSpentMsDelta: timeInfo?.delta ?? 0,
        }),
      });

      if (res.status === 401) { setSessionExpired(true); setSaving(false); return; }
      if (!res.ok) { setSaveError("Could not save. Check connection."); setSaving(false); return; }

      setQuestionStates((prev) => {
        const next = new Map(prev);
        const s = { ...next.get(qId)! };
        s.savedOption = s.draftOption;
        s.isMarkedForReview = markForReview;
        next.set(qId, s);
        return next;
      });

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1500);

      const nextIdx = currentIndex + 1;
      if (nextIdx < questions.length) navigateTo(nextIdx);
    } catch {
      setSaveError("Could not save. Check connection.");
    } finally {
      setSaving(false);
    }
  }

  // ── Pause / Resume ─────────────────────────────────────────────────────────

  async function handlePause() {
    if (!attemptMeta || pausing || isPaused) return;
    setPausing(true);
    setPauseError(null);
    recordTimeForCurrent();

    try {
      const res = await fetch(`/api/testhub/attempts/${attemptMeta.attemptId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.status === 401) { setSessionExpired(true); setPausing(false); return; }

      if (res.ok || res.status === 404) {
        // Accept 404 gracefully (endpoint not yet deployed); pause is soft client-side
        pausedAtRef.current = Date.now();
        setIsPaused(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setPauseError(data.error ?? "Could not pause test. Try again.");
      }
    } catch {
      // Network error — still allow client-side soft pause
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    } finally {
      setPausing(false);
    }
  }

  async function handleResume() {
    if (!attemptMeta || !isPaused) return;

    try {
      await fetch(`/api/testhub/attempts/${attemptMeta.attemptId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch { /* ignore — resume visually regardless */ }

    // Recalculate timeLeft from endsAt (real server time is authoritative)
    const endsAt = new Date(attemptMeta.endsAt).getTime();
    setTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    pausedAtRef.current = null;
    setIsPaused(false);
    questionStartTime.current = Date.now();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function buildFinalAnswers() {
    const finalAnswers: Array<{
      questionId: string;
      selectedOption: string | null;
      isMarkedForReview: boolean;
      timeSpentMs: number;
    }> = [];

    for (const q of questions) {
      const state = questionStates.get(q.id);
      if (!state) continue;
      const hasDraft = state.draftOption !== null;
      const draftDiffers = state.draftOption !== state.savedOption;
      if (hasDraft && draftDiffers) {
        finalAnswers.push({
          questionId: q.id,
          selectedOption: state.draftOption,
          isMarkedForReview: state.isMarkedForReview,
          timeSpentMs: state.timeSpentMs,
        });
      }
    }
    return finalAnswers;
  }

  async function handleSubmit() {
    if (!attemptMeta || submitting) return;
    setSubmitting(true);
    recordTimeForCurrent();

    try {
      const res = await fetch("/api/testhub/attempts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attemptId: attemptMeta.attemptId, finalAnswers: buildFinalAnswers() }),
      });

      if (res.status === 401) { setSessionExpired(true); setSubmitting(false); return; }
      if (res.ok) {
        router.push(`/testhub/tests/${testId}/submitted?attemptId=${attemptMeta.attemptId}`);
      } else {
        setSubmitting(false);
        setSaveError("Failed to submit. Please try again.");
      }
    } catch {
      setSubmitting(false);
      setSaveError("Failed to submit. Check connection.");
    }
  }

  async function handleAutoSubmit() {
    setAutoSubmitted(true);
    if (!attemptMeta) return;
    recordTimeForCurrent();

    try {
      await fetch("/api/testhub/attempts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attemptId: attemptMeta.attemptId, finalAnswers: buildFinalAnswers() }),
      });
    } catch {}

    setTimeout(() => {
      router.push(`/testhub/tests/${testId}/submitted?attemptId=${attemptMeta?.attemptId ?? ""}`);
    }, 3000);
  }

  // ── Counts & status helpers ────────────────────────────────────────────────

  function getStatusColor(qId: string, index: number): string {
    const s = questionStates.get(qId);
    if (!s || !s.visited) return "bg-gray-200 text-gray-600";
    const hasSaved = s.savedOption !== null;
    if (s.isMarkedForReview && hasSaved) return "bg-purple-500 text-white";
    if (s.isMarkedForReview) return "bg-purple-500 text-white";
    if (hasSaved) return "bg-green-500 text-white";
    return "bg-red-400 text-white";
  }

  const allCounts = (() => {
    let notVisited = 0, unattempted = 0, answered = 0, markedOnly = 0, answeredMarked = 0;
    for (const q of questions) {
      const s = questionStates.get(q.id);
      if (!s || !s.visited) { notVisited++; continue; }
      const hasSaved = s.savedOption !== null;
      if (s.isMarkedForReview && hasSaved) answeredMarked++;
      else if (s.isMarkedForReview) markedOnly++;
      else if (hasSaved) answered++;
      else unattempted++;
    }
    return { notVisited, unattempted, answered, markedOnly, answeredMarked };
  })();

  // For palette: filter to current section when sectionsEnabled
  const paletteQuestions = (() => {
    if (!testConfig?.sectionsEnabled || !currentSectionId) return questions;
    return questions.filter((q) => q.sectionId === currentSectionId);
  })();

  const paletteCounts = (() => {
    let notVisited = 0, unattempted = 0, answered = 0, markedOnly = 0, answeredMarked = 0;
    for (const q of paletteQuestions) {
      const s = questionStates.get(q.id);
      if (!s || !s.visited) { notVisited++; continue; }
      const hasSaved = s.savedOption !== null;
      if (s.isMarkedForReview && hasSaved) answeredMarked++;
      else if (s.isMarkedForReview) markedOnly++;
      else if (hasSaved) answered++;
      else unattempted++;
    }
    return { notVisited, unattempted, answered, markedOnly, answeredMarked };
  })();

  // ── Early returns ──────────────────────────────────────────────────────────

  if (loading && !sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading test...</div>
      </div>
    );
  }

  if (sessionExpired && (loading || !testConfig)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[#2D1B69] mb-2">Session Expired</h3>
          <p className="text-sm text-gray-500 mb-6">Please log in again to continue.</p>
          <button
            onClick={() => { window.location.href = `/login?from=${encodeURIComponent(`/testhub/tests/${testId}/attempt`)}`; }}
            className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-hover)]"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl p-8 shadow-sm border text-center max-w-md">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.push(`/testhub/tests/${testId}/brief`)} className="btn-glossy-secondary">
            Back to Brief
          </button>
        </div>
      </div>
    );
  }

  if (autoSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl p-8 shadow-sm border text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D1B69] mb-2">Time is Over</h2>
          <p className="text-gray-500 text-sm">Your test has been submitted automatically.</p>
          <p className="text-gray-400 text-xs mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentState = currentQ ? questionStates.get(currentQ.id) : null;
  const lang = attemptMeta?.language ?? "EN";
  const qText = lang === "TE" ? currentQ?.questionText_te : currentQ?.questionText_en;
  const options = currentQ
    ? [
        { key: "A", text: lang === "TE" ? currentQ.optionA_te : currentQ.optionA_en },
        { key: "B", text: lang === "TE" ? currentQ.optionB_te : currentQ.optionB_en },
        { key: "C", text: lang === "TE" ? currentQ.optionC_te : currentQ.optionC_en },
        { key: "D", text: lang === "TE" ? currentQ.optionD_te : currentQ.optionD_en },
      ]
    : [];

  // ── Palette content ────────────────────────────────────────────────────────

  const paletteContent = (
    <div>
      {testConfig?.sectionsEnabled && sections.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Section</p>
          <div className="flex flex-wrap gap-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => { navigateToSection(sec.id); setPaletteOpen(false); }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  sec.id === currentSectionId
                    ? "bg-[#2D1B69] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5 text-[11px] font-medium mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /><span className="text-gray-500">Not Visited ({paletteCounts.notVisited})</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /><span className="text-gray-500">Unanswered ({paletteCounts.unattempted})</span></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /><span className="text-gray-500">Answered ({paletteCounts.answered})</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /><span className="text-gray-500">Review ({paletteCounts.markedOnly})</span></div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {paletteQuestions.map((q, paletteIdx) => {
          const globalIdx = questions.indexOf(q);
          const s = questionStates.get(q.id);
          const hasSavedAndMarked = s?.isMarkedForReview && s?.savedOption !== null;
          return (
            <button
              key={q.id}
              onClick={() => { navigateTo(globalIdx); setPaletteOpen(false); }}
              className={`relative w-10 h-10 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${getStatusColor(q.id, globalIdx)} ${globalIdx === currentIndex ? "ring-2 ring-[#2D1B69] ring-offset-1" : ""}`}
            >
              {q.order}
              {hasSavedAndMarked && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowSubmitConfirm(true)}
        className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
      >
        Submit Test
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-[#2D1B69] text-white py-2.5 px-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate">{testConfig?.name}</h1>
            <p className="text-[10px] text-purple-200">{testConfig?.code}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <InstructionsPill test={test} />

            {/* Pause button */}
            {testConfig?.pauseAllowed && !isPaused && (
              <button
                onClick={handlePause}
                disabled={pausing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors disabled:opacity-50"
                title="Pause test"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span className="hidden sm:inline">{pausing ? "Pausing..." : "Pause"}</span>
              </button>
            )}

            {/* Timers */}
            <div className="flex items-center gap-1.5">
              {/* Section timer */}
              {testConfig?.sectionsEnabled && sectionTimeLeft !== null && (
                <div className="flex flex-col items-center">
                  <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg ${sectionTimeLeft <= 120 ? "bg-orange-500/30 text-orange-200" : "bg-white/10"}`}>
                    {formatTime(sectionTimeLeft)}
                  </div>
                  <span className="text-[8px] text-purple-300 mt-0.5">Section</span>
                </div>
              )}

              {/* Total timer */}
              <div className="flex flex-col items-center">
                <div className={`font-mono text-sm font-bold px-3 py-1 rounded-lg ${timeLeft <= 300 ? "bg-red-500/20 text-red-200 animate-pulse" : "bg-white/10"}`}>
                  {formatTime(timeLeft)}
                </div>
                {testConfig?.sectionsEnabled && sectionTimeLeft !== null && (
                  <span className="text-[8px] text-purple-300 mt-0.5">Total</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section cards ── */}
      {testConfig?.sectionsEnabled && sections.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            {sections.map((sec) => {
              const sectionQs = questions.filter((q) => q.sectionId === sec.id);
              const sectionAnswered = sectionQs.filter((q) => questionStates.get(q.id)?.savedOption !== null).length;
              const isActive = sec.id === currentSectionId;
              return (
                <button
                  key={sec.id}
                  onClick={() => navigateToSection(sec.id)}
                  className={`flex-shrink-0 flex flex-col items-start px-3 py-1.5 rounded-lg border text-left transition-all ${
                    isActive
                      ? "border-[#6D4BCB] bg-purple-50 text-[#2D1B69]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isActive ? "text-[#2D1B69]" : "text-gray-700"}`}>
                    {sec.title}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {sectionAnswered}/{sectionQs.length} answered
                    {sec.durationSec ? ` · ${Math.round(sec.durationSec / 60)}m` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-grow flex max-w-7xl mx-auto w-full">

        {/* Left: question area */}
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">

          {pauseError && (
            <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg border border-amber-200 mb-4 flex items-center justify-between">
              <span>{pauseError}</span>
              <button onClick={() => setPauseError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                  Question {currentQ?.order ?? currentIndex + 1} of {questions.length}
                </span>
                {testConfig?.sectionsEnabled && currentSectionId && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                    {sections.find((s) => s.id === currentSectionId)?.title ?? ""}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                +{testConfig?.marksPerQuestion} / -{testConfig?.negativeMarking}
              </span>
            </div>

            <div
              className="text-[15px] text-gray-800 leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(qText) }}
            />

            <div className="space-y-3">
              {options.map((opt) => {
                const isSelected = currentState?.draftOption === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => selectOption(opt.key)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all text-sm ${
                      isSelected
                        ? "border-purple-400 bg-purple-50/50"
                        : "border-gray-150 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mr-3 flex-shrink-0 ${
                      isSelected ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {opt.key}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text) }} />
                  </button>
                );
              })}
            </div>
          </div>

          {savedToast && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
              Saved
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 mb-4">
              {saveError}
              <button onClick={() => setSaveError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={clearResponse}
              className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Clear Response
            </button>
            <button
              onClick={() => saveAnswer(true)}
              disabled={saving}
              className="px-4 py-2.5 text-sm rounded-xl border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Mark for Review & Next"}
            </button>
            <button
              onClick={() => saveAnswer(false)}
              disabled={saving}
              className="px-4 py-2.5 text-sm rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Next"}
            </button>
          </div>

          {/* Mobile palette toggle */}
          <div className="md:hidden mt-4">
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm"
            >
              <span className="font-medium text-gray-700">
                Question Palette
                {testConfig?.sectionsEnabled && currentSectionId && (
                  <span className="ml-1 text-xs text-gray-400">
                    — {sections.find((s) => s.id === currentSectionId)?.title}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />{paletteCounts.answered}</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />{paletteCounts.unattempted}</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />{paletteCounts.notVisited}</span>
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
        </div>

        {/* Right: desktop palette */}
        <div className="hidden md:block w-64 flex-shrink-0 border-l border-gray-200 bg-white p-4 sticky top-0 h-screen overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Question Palette
            {testConfig?.sectionsEnabled && currentSectionId && (
              <span className="ml-1 normal-case font-normal text-purple-500">
                — {sections.find((s) => s.id === currentSectionId)?.title}
              </span>
            )}
          </h3>
          {paletteContent}

          {/* Summary of other sections */}
          {testConfig?.sectionsEnabled && sections.length > 1 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">All Sections</p>
              <div className="space-y-1.5">
                {sections.map((sec) => {
                  const secQs = questions.filter((q) => q.sectionId === sec.id);
                  const secAnswered = secQs.filter((q) => questionStates.get(q.id)?.savedOption !== null).length;
                  const isActive = sec.id === currentSectionId;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => navigateToSection(sec.id)}
                      className={`w-full flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg transition-colors ${
                        isActive ? "bg-purple-50 text-[#2D1B69]" : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="font-medium truncate">{sec.title}</span>
                      <span className={`ml-2 flex-shrink-0 ${secAnswered === secQs.length ? "text-green-500" : "text-gray-400"}`}>
                        {secAnswered}/{secQs.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Paused overlay ── */}
      {isPaused && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#2D1B69]/90 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#6D4BCB]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#2D1B69] mb-2">Test Paused</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your answers are saved. Click resume when you are ready to continue.
            </p>
            <button
              onClick={handleResume}
              className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary-hover)] transition-colors"
            >
              Resume Test
            </button>
          </div>
        </div>
      )}

      {/* ── Session expired overlay ── */}
      {sessionExpired && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#2D1B69] mb-2">Session Expired</h3>
            <p className="text-sm text-gray-500 mb-6">Please log in again to continue.</p>
            <button
              onClick={() => { window.location.href = `/login?from=${encodeURIComponent(`/testhub/tests/${testId}/attempt`)}`; }}
              className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-hover)]"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* ── Submit confirmation dialog ── */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowSubmitConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#2D1B69] mb-3">Submit Test?</h3>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>Answered: <strong className="text-green-600">{allCounts.answered + allCounts.answeredMarked}</strong></p>
              <p>Unanswered: <strong className="text-red-500">{allCounts.unattempted + allCounts.notVisited}</strong></p>
              <p>Marked for Review: <strong className="text-purple-600">{allCounts.markedOnly + allCounts.answeredMarked}</strong></p>
            </div>
            <p className="text-xs text-gray-400 mb-6">Any unsaved selections will be auto-saved before submission.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Continue Test
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

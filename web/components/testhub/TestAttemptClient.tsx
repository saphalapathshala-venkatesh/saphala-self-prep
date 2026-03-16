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
  title: string;
  code: string | null;
  totalDurationSec: number | null;
  marksPerQuestion: number;
  negativeMarks: number;
  pauseAllowed: boolean;
  sectionsEnabled: boolean;
  subsectionsEnabled: boolean;
  timerMode: "TOTAL" | "SECTION" | "SUBSECTION";
  strictSectionMode: boolean;
}

interface QuestionOption {
  id: string;
  textEn: string | null;
  textTe: string | null;
  order: number;
}

interface QuestionData {
  id: string;
  sectionId: string | null;
  displayOrder: number;
  stemEn: string | null;
  stemTe: string | null;
  options: QuestionOption[];
}

interface AttemptMeta {
  attemptId: string;
  language: "EN" | "TE";
  endsAt: string;           // ISO — updated after each resume
  status: string;
  currentlyPaused: boolean;
  lastPausedAt: string | null; // ISO — null when not paused
}

interface QuestionState {
  visited: boolean;
  draftOptionId: string | null;
  savedOptionId: string | null;
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

/** Map option index (0-based) to letter A-D */
function indexToLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Compute remaining seconds given current endsAt.
 * Safe even when endsAt is null (returns 0).
 */
function remainingSeconds(endsAtIso: string | null): number {
  if (!endsAtIso) return 0;
  return Math.max(0, Math.floor((new Date(endsAtIso).getTime() - Date.now()) / 1000));
}

/**
 * Compute the frozen remaining seconds at the moment of pause.
 * = endsAt - lastPausedAt (both server timestamps)
 */
function frozenRemainingSeconds(endsAtIso: string, lastPausedAtIso: string): number {
  const endsAt = new Date(endsAtIso).getTime();
  const pausedAt = new Date(lastPausedAtIso).getTime();
  return Math.max(0, Math.floor((endsAt - pausedAt) / 1000));
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

  // Timers — stored as seconds
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
  const sectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const [resuming, setResuming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  const questionStartTime = useRef<number>(Date.now());
  const autoSubmitTriggered = useRef(false);
  // Stores sectionTimeLeft at the moment of pause so resume can continue from that point
  const frozenSectionTimeRef = useRef<number | null>(null);

  // ── Initial data load ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      try {
        // Step 1 + 2 in parallel: test brief + start/resume attempt
        const [testRes, startRes] = await Promise.all([
          fetch(`/api/student/tests/${testId}`, { credentials: "include" }),
          fetch("/api/student/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ testId }),
          }),
        ]);

        if (testRes.status === 401 || startRes.status === 401) {
          setSessionExpired(true); setLoading(false); return;
        }
        if (startRes.status === 409) {
          const d = await startRes.json().catch(() => ({}));
          setError(d.error || "This test is already open on another device. Close it there first.");
          setLoading(false); return;
        }
        if (!testRes.ok) {
          const d = await testRes.json().catch(() => ({}));
          setError(d.error || "Failed to load test data"); setLoading(false); return;
        }
        if (!startRes.ok) {
          const d = await startRes.json().catch(() => ({}));
          setError(d.error || "Failed to start test"); setLoading(false); return;
        }

        const [testData, startData] = await Promise.all([testRes.json(), startRes.json()]);
        const { attemptId, language } = startData as { attemptId: string; language: "EN" | "TE" };

        // Step 3: fetch attempt state (answers + pause state + endsAt)
        const attemptRes = await fetch(`/api/student/attempts/${attemptId}`, {
          credentials: "include",
        });
        if (attemptRes.status === 401) { setSessionExpired(true); setLoading(false); return; }
        if (attemptRes.status === 409) {
          const d = await attemptRes.json().catch(() => ({}));
          setError(d.error || "This test is already open on another device.");
          setLoading(false); return;
        }
        if (!attemptRes.ok) {
          const d = await attemptRes.json().catch(() => ({}));
          setError(d.error || "Failed to load attempt data");
          setLoading(false); return;
        }

        const attemptData = await attemptRes.json();

        // Build test config
        const cfg: TestConfig = {
          id: testData.id,
          title: testData.title,
          code: testData.code,
          totalDurationSec: testData.totalDurationSec ?? null,
          marksPerQuestion: testData.marksPerQuestion ?? 1,
          negativeMarks: testData.negativeMarks ?? 0,
          pauseAllowed: testData.pauseAllowed ?? false,
          sectionsEnabled: testData.sectionsEnabled ?? false,
          subsectionsEnabled: testData.subsectionsEnabled ?? false,
          timerMode: testData.timerMode ?? "TOTAL",
          strictSectionMode: testData.strictSectionMode ?? false,
        };

        const qs: QuestionData[] = testData.questions ?? [];
        const secs: SectionMeta[] = testData.sections ?? [];

        const meta: AttemptMeta = {
          attemptId,
          language,
          endsAt: attemptData.endsAt,
          status: attemptData.status,
          currentlyPaused: attemptData.currentlyPaused ?? false,
          lastPausedAt: attemptData.lastPausedAt ?? null,
        };

        setTestConfig(cfg);
        setAttemptMeta(meta);
        setQuestions(qs);
        setSections(secs);

        // Build question states from saved answers
        const savedMap = new Map<string, { selectedOptionId: string | null; isMarkedForReview: boolean; timeSpentMs: number }>();
        for (const a of attemptData.answers ?? []) {
          savedMap.set(a.questionId, {
            selectedOptionId: a.selectedOptionId ?? null,
            isMarkedForReview: a.isMarkedForReview ?? false,
            timeSpentMs: a.timeSpentMs ?? 0,
          });
        }

        const states = new Map<string, QuestionState>();
        for (const q of qs) {
          const saved = savedMap.get(q.id);
          states.set(q.id, {
            visited: !!saved,
            draftOptionId: saved?.selectedOptionId ?? null,
            savedOptionId: saved?.selectedOptionId ?? null,
            isMarkedForReview: saved?.isMarkedForReview ?? false,
            timeSpentMs: saved?.timeSpentMs ?? 0,
          });
        }
        if (qs.length > 0) {
          const first = states.get(qs[0].id);
          if (first) first.visited = true;
          setCurrentSectionId(qs[0].sectionId ?? null);
        }
        setQuestionStates(states);

        // Set initial timer
        // If currently paused: freeze at (endsAt - lastPausedAt)
        // If running: live countdown from endsAt
        if (meta.currentlyPaused && meta.lastPausedAt) {
          setTimeLeft(frozenRemainingSeconds(meta.endsAt, meta.lastPausedAt));
          setIsPaused(true);
        } else {
          setTimeLeft(remainingSeconds(meta.endsAt));
        }

        setLoading(false);
      } catch {
        setError("Failed to load test data. Please check your connection.");
        setLoading(false);
      }
    }
    fetchData();
  }, [testId]);

  // ── Total timer tick ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!attemptMeta || isPaused) return;

    const interval = setInterval(() => {
      const rem = remainingSeconds(attemptMeta.endsAt);
      setTimeLeft(rem);
      if (rem <= 0 && !autoSubmitTriggered.current) {
        autoSubmitTriggered.current = true;
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptMeta?.endsAt, isPaused]);

  // ── Section timer ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);

    if (!testConfig?.sectionsEnabled || testConfig.timerMode === "TOTAL" || !currentSectionId) {
      setSectionTimeLeft(null);
      return;
    }

    if (isPaused) {
      // Paused: stop the interval but keep sectionTimeLeft visible for the overlay
      return;
    }

    const section = sections.find((s) => s.id === currentSectionId);
    if (!section?.durationSec) { setSectionTimeLeft(null); return; }

    // Resume from frozen value if available (pause/resume), otherwise start fresh.
    // Clamp to totalDuration to prevent section timer exceeding total timer.
    const maxAllowed = testConfig?.totalDurationSec ?? section.durationSec;
    const freshStart = Math.min(section.durationSec, maxAllowed);
    let remaining = frozenSectionTimeRef.current !== null
      ? Math.min(frozenSectionTimeRef.current, timeLeft)
      : freshStart;
    frozenSectionTimeRef.current = null; // Consume the frozen value

    if (section.durationSec > maxAllowed) {
      console.warn(
        `[TestHub] Section "${section.title}" duration (${section.durationSec}s) exceeds test total duration (${maxAllowed}s). Clamping.`
      );
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, testConfig?.sectionsEnabled, testConfig?.timerMode, testConfig?.totalDurationSec, isPaused, sections]);

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
    if (nextSectionId !== currentSectionId) setCurrentSectionId(nextSectionId);
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

  function selectOption(optionId: string) {
    if (isPaused) return; // No changes while paused
    const qId = questions[currentIndex].id;
    setQuestionStates((prev) => {
      const next = new Map(prev);
      const state = { ...next.get(qId)! };
      state.draftOptionId = state.draftOptionId === optionId ? null : optionId;
      next.set(qId, state);
      return next;
    });
  }

  function clearResponse() {
    if (isPaused) return;
    const qId = questions[currentIndex].id;
    setQuestionStates((prev) => {
      const next = new Map(prev);
      const state = { ...next.get(qId)! };
      state.draftOptionId = null;
      state.savedOptionId = null;
      state.isMarkedForReview = false;
      next.set(qId, state);
      return next;
    });
  }

  async function saveAnswer(markForReview: boolean) {
    if (!attemptMeta || saving || isPaused) return;
    setSaving(true);
    setSaveError(null);

    const qId = questions[currentIndex].id;
    const timeInfo = recordTimeForCurrent();
    const state = questionStates.get(qId)!;

    try {
      const res = await fetch(`/api/student/attempts/${attemptMeta.attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionId: qId,
          selectedOptionId: state.draftOptionId,
          isMarkedForReview: markForReview,
          timeSpentMsDelta: timeInfo?.delta ?? 0,
        }),
      });

      if (res.status === 401) { setSessionExpired(true); setSaving(false); return; }
      if (res.status === 409) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Access conflict. Reload the page.");
        setSaving(false); return;
      }
      if (!res.ok) { setSaveError("Could not save. Check connection."); setSaving(false); return; }

      setQuestionStates((prev) => {
        const next = new Map(prev);
        const s = { ...next.get(qId)! };
        s.savedOptionId = s.draftOptionId;
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

  // ── Pause ──────────────────────────────────────────────────────────────────

  async function handlePause() {
    if (!attemptMeta || pausing || isPaused) return;
    setPausing(true);
    setPauseError(null);
    recordTimeForCurrent(); // Snapshot time before pausing
    // Preserve section timer so resume can continue from this point
    if (sectionTimeLeft !== null) {
      frozenSectionTimeRef.current = sectionTimeLeft;
    }

    try {
      const res = await fetch(`/api/student/attempts/${attemptMeta.attemptId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.status === 401) { setSessionExpired(true); setPausing(false); return; }

      if (res.ok) {
        // Freeze the timer at current displayed value (no need to recompute — already live)
        setIsPaused(true);
        setAttemptMeta((prev) => prev ? { ...prev, status: "PAUSED", currentlyPaused: true } : prev);
      } else {
        const d = await res.json().catch(() => ({}));
        if (d.code === "ALREADY_PAUSED") {
          // Already paused in DB — sync local state
          setIsPaused(true);
          setAttemptMeta((prev) => prev ? { ...prev, status: "PAUSED", currentlyPaused: true } : prev);
        } else {
          setPauseError(d.error ?? "Could not pause. Try again.");
        }
      }
    } catch {
      // Network error — still show pause overlay (test is offline anyway)
      setIsPaused(true);
    } finally {
      setPausing(false);
    }
  }

  // ── Resume ─────────────────────────────────────────────────────────────────

  async function handleResume() {
    if (!attemptMeta || !isPaused || resuming) return;
    setResuming(true);
    setPauseError(null);

    try {
      const res = await fetch(`/api/student/attempts/${attemptMeta.attemptId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.status === 401) { setSessionExpired(true); setResuming(false); return; }

      if (res.ok) {
        const data = await res.json();
        // Use the new endsAt returned by the server (already extended by pause duration)
        const newEndsAt: string = data.endsAt ?? attemptMeta.endsAt;
        setAttemptMeta((prev) => prev
          ? { ...prev, status: "IN_PROGRESS", currentlyPaused: false, lastPausedAt: null, endsAt: newEndsAt }
          : prev
        );
        // Recompute timeLeft from new endsAt
        setTimeLeft(remainingSeconds(newEndsAt));
        setIsPaused(false);
        questionStartTime.current = Date.now();
      } else {
        const d = await res.json().catch(() => ({}));
        // If NOT_PAUSED error — DB and FE are out of sync; force-resume locally
        if (d.error?.includes("not paused") || d.error?.includes("NOT_PAUSED")) {
          setAttemptMeta((prev) => prev
            ? { ...prev, status: "IN_PROGRESS", currentlyPaused: false, lastPausedAt: null }
            : prev
          );
          setTimeLeft(remainingSeconds(attemptMeta.endsAt));
          setIsPaused(false);
          questionStartTime.current = Date.now();
        } else {
          setPauseError(d.error ?? "Could not resume. Please try again.");
        }
      }
    } catch {
      // Network error — still allow resume locally so student isn't stuck
      setAttemptMeta((prev) => prev
        ? { ...prev, status: "IN_PROGRESS", currentlyPaused: false, lastPausedAt: null }
        : prev
      );
      setTimeLeft(remainingSeconds(attemptMeta.endsAt));
      setIsPaused(false);
      questionStartTime.current = Date.now();
    } finally {
      setResuming(false);
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function buildFinalAnswers() {
    const out: Array<{
      questionId: string;
      selectedOptionId: string | null;
      isMarkedForReview: boolean;
      timeSpentMs: number;
    }> = [];
    for (const q of questions) {
      const state = questionStates.get(q.id);
      if (!state) continue;
      const draftDiffers = state.draftOptionId !== state.savedOptionId;
      if (draftDiffers) {
        out.push({
          questionId: q.id,
          selectedOptionId: state.draftOptionId,
          isMarkedForReview: state.isMarkedForReview,
          timeSpentMs: state.timeSpentMs,
        });
      }
    }
    return out;
  }

  async function handleSubmit() {
    if (!attemptMeta || submitting) return;

    if (isPaused) {
      setSaveError("Please resume the test before submitting.");
      setShowSubmitConfirm(false);
      return;
    }

    setSubmitting(true);
    recordTimeForCurrent();

    try {
      const res = await fetch(`/api/student/attempts/${attemptMeta.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ finalAnswers: buildFinalAnswers() }),
      });

      if (res.status === 401) { setSessionExpired(true); setSubmitting(false); return; }

      if (res.ok) {
        router.push(`/testhub/tests/${testId}/submitted?attemptId=${attemptMeta.attemptId}`);
      } else {
        const d = await res.json().catch(() => ({}));
        if (d.code === "ATTEMPT_PAUSED") {
          setSaveError("Resume the test before submitting.");
          setIsPaused(true);
        } else {
          setSaveError(d.error ?? "Failed to submit. Please try again.");
        }
        setSubmitting(false);
      }
    } catch {
      setSaveError("Failed to submit. Check connection.");
      setSubmitting(false);
    }
  }

  async function handleAutoSubmit() {
    setAutoSubmitted(true);
    if (!attemptMeta) return;
    recordTimeForCurrent();
    try {
      await fetch(`/api/student/attempts/${attemptMeta.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ finalAnswers: buildFinalAnswers() }),
      });
    } catch {}
    setTimeout(() => {
      router.push(`/testhub/tests/${testId}/submitted?attemptId=${attemptMeta?.attemptId ?? ""}`);
    }, 3000);
  }

  // ── Status helpers ─────────────────────────────────────────────────────────

  function getStatusColor(qId: string, isCurrentIndex: boolean): string {
    const s = questionStates.get(qId);
    if (!s || !s.visited) return "bg-gray-200 text-gray-600";
    const hasSaved = s.savedOptionId !== null;
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
      const hasSaved = s.savedOptionId !== null;
      if (s.isMarkedForReview && hasSaved) answeredMarked++;
      else if (s.isMarkedForReview) markedOnly++;
      else if (hasSaved) answered++;
      else unattempted++;
    }
    return { notVisited, unattempted, answered, markedOnly, answeredMarked };
  })();

  const paletteQuestions = testConfig?.sectionsEnabled && currentSectionId
    ? questions.filter((q) => q.sectionId === currentSectionId)
    : questions;

  const paletteCounts = (() => {
    let notVisited = 0, unattempted = 0, answered = 0, markedOnly = 0, answeredMarked = 0;
    for (const q of paletteQuestions) {
      const s = questionStates.get(q.id);
      if (!s || !s.visited) { notVisited++; continue; }
      const hasSaved = s.savedOptionId !== null;
      if (s.isMarkedForReview && hasSaved) answeredMarked++;
      else if (s.isMarkedForReview) markedOnly++;
      else if (hasSaved) answered++;
      else unattempted++;
    }
    return { notVisited, unattempted, answered, markedOnly, answeredMarked };
  })();

  // ── Early returns ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading test...</div>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <SessionExpiredCard testId={testId} />
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

  const qText = currentQ
    ? (lang === "TE" ? currentQ.stemTe : currentQ.stemEn)
    : "";

  const renderedOptions = currentQ?.options.map((opt, idx) => ({
    id: opt.id,
    label: indexToLetter(idx),
    text: lang === "TE" ? opt.textTe : opt.textEn,
  })) ?? [];

  const currentSectionTitle = currentSectionId
    ? sections.find((s) => s.id === currentSectionId)?.title
    : null;

  // ── Palette content ────────────────────────────────────────────────────────

  const paletteContent = (
    <div>
      {testConfig?.sectionsEnabled && sections.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Sections</p>
          <div className="flex flex-wrap gap-1">
            {sections.map((sec) => {
              const secQs = questions.filter((q) => q.sectionId === sec.id);
              const secAnswered = secQs.filter((q) => questionStates.get(q.id)?.savedOptionId !== null).length;
              return (
              <button
                key={sec.id}
                onClick={() => { navigateToSection(sec.id); setPaletteOpen(false); }}
                title={`${sec.title} — ${secAnswered}/${secQs.length} answered`}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors border ${
                  sec.id === currentSectionId
                    ? "bg-[#2D1B69] text-white border-[#2D1B69]"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {sec.title}
                <span className={`ml-1 ${sec.id === currentSectionId ? "text-purple-200" : "text-gray-400"}`}>
                  {secAnswered}/{secQs.length}
                </span>
              </button>
            )})}
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
        {paletteQuestions.map((q) => {
          const globalIdx = questions.indexOf(q);
          const s = questionStates.get(q.id);
          const hasSavedAndMarked = s?.isMarkedForReview && s?.savedOptionId !== null;
          return (
            <button
              key={q.id}
              onClick={() => { navigateTo(globalIdx); setPaletteOpen(false); }}
              className={`relative w-10 h-10 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${getStatusColor(q.id, globalIdx === currentIndex)} ${globalIdx === currentIndex ? "ring-2 ring-[#2D1B69] ring-offset-1" : ""}`}
            >
              {q.displayOrder}
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
        disabled={isPaused}
        className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Submit Test
      </button>
      {isPaused && (
        <p className="text-[10px] text-center text-amber-600 mt-1.5">Resume the test to submit.</p>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-[#2D1B69] text-white py-2.5 px-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate">{testConfig?.title}</h1>
            {testConfig?.code && <p className="text-[10px] text-purple-200">{testConfig.code}</p>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <InstructionsPill test={test} />

            {/* Pause button — shown only when pauseAllowed and not currently paused */}
            {testConfig?.pauseAllowed && !isPaused && (
              <button
                onClick={handlePause}
                disabled={pausing}
                title="Pause test"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span className="hidden sm:inline">{pausing ? "Pausing..." : "Pause"}</span>
              </button>
            )}

            {/* Timers */}
            <div className="flex items-center gap-2">
              {testConfig?.sectionsEnabled && sectionTimeLeft !== null && testConfig.timerMode !== "TOTAL" && (
                <div className="flex flex-col items-center">
                  {(() => {
                    // Clamp displayed section time to remaining total time to prevent display mismatch
                    const clampedSec = Math.min(sectionTimeLeft, timeLeft);
                    if (!isPaused && sectionTimeLeft > timeLeft) {
                      console.warn(`[TestHub] Section timer (${sectionTimeLeft}s) exceeds total timer (${timeLeft}s) — clamping display.`);
                    }
                    return (
                      <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg ${clampedSec <= 120 ? "bg-orange-500/30 text-orange-200" : "bg-white/10"}`}>
                        {isPaused ? "—:——" : formatTime(clampedSec)}
                      </div>
                    );
                  })()}
                  <span className="text-[8px] text-purple-300 mt-0.5">Section</span>
                </div>
              )}

              <div className="flex flex-col items-center">
                <div className={`font-mono text-sm font-bold px-3 py-1 rounded-lg ${
                  isPaused
                    ? "bg-amber-500/20 text-amber-200"
                    : timeLeft <= 300
                    ? "bg-red-500/20 text-red-200 animate-pulse"
                    : "bg-white/10"
                }`}>
                  {isPaused ? "PAUSED" : formatTime(timeLeft)}
                </div>
                {testConfig?.sectionsEnabled && sectionTimeLeft !== null && testConfig.timerMode !== "TOTAL" && (
                  <span className="text-[8px] text-purple-300 mt-0.5">Total</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section cards bar ── */}
      {testConfig?.sectionsEnabled && sections.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            {sections.map((sec) => {
              const secQs = questions.filter((q) => q.sectionId === sec.id);
              const secAnswered = secQs.filter((q) => questionStates.get(q.id)?.savedOptionId !== null).length;
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
                  <span className={`text-xs font-semibold ${isActive ? "text-[#2D1B69]" : "text-gray-700"}`}>{sec.title}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {secAnswered}/{secQs.length} answered
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

          <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 mb-4 transition-opacity ${isPaused ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                  Question {currentQ?.displayOrder ?? currentIndex + 1} of {questions.length}
                </span>
                {currentSectionTitle && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{currentSectionTitle}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">+{testConfig?.marksPerQuestion} / -{testConfig?.negativeMarks}</span>
            </div>

            <div
              className="text-[15px] text-gray-800 leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(qText ?? "") }}
            />

            <div className="space-y-2.5" role="radiogroup">
              {renderedOptions.map((opt) => {
                const isSelected = currentState?.draftOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => !isPaused && selectOption(opt.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                      isPaused
                        ? "cursor-default opacity-70"
                        : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-[#6D4BCB] bg-purple-50/60"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {/* Radio ring */}
                    <span className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "border-[#6D4BCB] bg-[#6D4BCB]"
                        : "border-gray-300 bg-white"
                    }`}>
                      {isSelected && <span className="w-[7px] h-[7px] rounded-full bg-white" />}
                    </span>
                    {/* Option letter */}
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold flex-shrink-0 ${
                      isSelected ? "bg-[#6D4BCB] text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {opt.label}
                    </span>
                    {/* Option text */}
                    <span
                      className="flex-grow text-sm text-gray-800 leading-relaxed pt-0.5"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text ?? "") }}
                    />
                  </div>
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

          <div className={`flex items-center gap-2 flex-wrap ${isPaused ? "opacity-40 pointer-events-none" : ""}`}>
            <button onClick={clearResponse} className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Clear Response
            </button>
            <button
              onClick={() => saveAnswer(true)}
              disabled={saving || isPaused}
              className="px-4 py-2.5 text-sm rounded-xl border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Mark for Review & Next"}
            </button>
            <button
              onClick={() => saveAnswer(false)}
              disabled={saving || isPaused}
              className="px-4 py-2.5 text-sm rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Next"}
            </button>
          </div>

          {/* Mobile palette */}
          <div className="md:hidden mt-4">
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm"
            >
              <span className="font-medium text-gray-700">
                Question Palette
                {currentSectionTitle && <span className="ml-1 text-xs text-gray-400">— {currentSectionTitle}</span>}
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
            {currentSectionTitle && (
              <span className="ml-1 normal-case font-normal text-purple-500">— {currentSectionTitle}</span>
            )}
          </h3>
          {paletteContent}

          {testConfig?.sectionsEnabled && sections.length > 1 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">All Sections</p>
              <div className="space-y-1.5">
                {sections.map((sec) => {
                  const secQs = questions.filter((q) => q.sectionId === sec.id);
                  const secAnswered = secQs.filter((q) => questionStates.get(q.id)?.savedOptionId !== null).length;
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

      {/* ── Paused overlay — blocks entire UI ── */}
      {isPaused && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#2D1B69]/90 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#6D4BCB]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#2D1B69] mb-2">Test Paused</h2>
            <p className="text-sm text-gray-500 mb-1">
              Your answers are saved. The timer has stopped.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Remaining time: <strong className="text-[#2D1B69]">{formatTime(timeLeft)}</strong>
            </p>
            {pauseError && (
              <div className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded-lg">{pauseError}</div>
            )}
            <button
              onClick={handleResume}
              disabled={resuming}
              className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-50"
            >
              {resuming ? "Resuming..." : "Resume Test"}
            </button>
          </div>
        </div>
      )}

      {/* ── Session expired overlay ── */}
      {sessionExpired && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4">
          <SessionExpiredCard testId={testId} />
        </div>
      )}

      {/* ── Submit confirm dialog ── */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#2D1B69] mb-3">Submit Test?</h3>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>Answered: <strong className="text-green-600">{allCounts.answered + allCounts.answeredMarked}</strong></p>
              <p>Unanswered: <strong className="text-red-500">{allCounts.unattempted + allCounts.notVisited}</strong></p>
              <p>Marked for Review: <strong className="text-purple-600">{allCounts.markedOnly + allCounts.answeredMarked}</strong></p>
            </div>
            <p className="text-xs text-gray-400 mb-6">Any unsaved selections will be flushed before submission.</p>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SessionExpiredCard({ testId }: { testId: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
        <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#2D1B69] mb-2">Session Expired</h3>
      <p className="text-sm text-gray-500 mb-6">Please log in again to continue.</p>
      <button
        onClick={() => {
          window.location.href = `/login?from=${encodeURIComponent(`/testhub/tests/${testId}/attempt`)}`;
        }}
        className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-hover)]"
      >
        Log In
      </button>
    </div>
  );
}

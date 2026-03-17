"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import type { FlashCard } from "@/lib/contentDb";
import { ROUTES } from "@/config/terminology";
import BrandFooter from "@/components/learn/BrandFooter";
import { triggerXpCelebration } from "@/lib/xpCelebration";

// ── CSS variable helpers ─────────────────────────────────────────────────────
// Root element sets --fc-accent (buttons, borders, labels) and
// --fc-cover-bg (TITLE card bg). All descendants inherit via utility classes
// (fc-accent-btn, fc-accent-text, fc-accent-bar) or var() inline styles.
function accentVars(subjectColor: string | null): React.CSSProperties {
  return {
    "--fc-accent": subjectColor || "#6D4BCB",
    "--fc-cover-bg": subjectColor || "#2D1B69",
  } as React.CSSProperties;
}

// ── Utilities ────────────────────────────────────────────────────────────────
function SafeHtml({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  const safe = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  return (
    <div
      className={`fc-rich ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

// ── Content interfaces ────────────────────────────────────────────────────────
// These mirror the JSON shapes the admin editor writes into FlashcardCard.content.
// All fields are optional so old cards without new fields continue to work.
interface TitleContent {
  titleOverride?: string;
  subtitle?: string;
  template?: string;
}
interface InfoContent {
  body?: string;
  title?: string;
  keyPoints?: string[];
  example?: string | null;
  imageUrl?: string | null;
}
interface QuizContent {
  question?: string;
  options?: { text: string; isCorrect: boolean }[];
  explanation?: string;
}
interface FillInBlankContent {
  sentence?: string;
  blanks?: { id: string; accepted: string[] }[];
  explanation?: string;
  instruction?: string;
}
interface MatchingContent {
  pairs?: { left: string; right: string }[];
  explanation?: string;
  instruction?: string;
}
interface ReorderContent {
  items?: string[];
  explanation?: string;
  instruction?: string;
}
interface CategorizationContent {
  items?: { text: string; category: string }[];
  categories?: string[];
  explanation?: string;
  instruction?: string;
}

// ── Card Shell ────────────────────────────────────────────────────────────────
// Wraps every card with a colored header (subject + XP) and a subtle footer
// (institute name + tagline). Both use constants from the terminology config.

interface ShellProps {
  subject: string | null;
  xpEnabled: boolean;
  xpValue: number;
  children: React.ReactNode;
}

function CardShell({ subject, xpEnabled, xpValue, children }: ShellProps) {
  const showXp = xpEnabled && xpValue > 0;
  return (
    <div
      className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-[0_6px_32px_rgba(0,0,0,0.18)] flex flex-col min-h-[540px] sm:min-h-[600px]"
      style={{
        border: "3px solid var(--fc-accent, #6D4BCB)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 sm:px-6 py-3 shrink-0"
        style={{ backgroundColor: "var(--fc-accent, #6D4BCB)" }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-white text-[11px] font-bold uppercase tracking-widest truncate leading-tight">
            {subject || "Flashcards"}
          </p>
          {showXp && (
            <p className="text-white/70 text-[9px] mt-0.5 leading-tight">
              Complete deck to earn {xpValue} XP
            </p>
          )}
        </div>
        {showXp && (
          <span className="ml-3 shrink-0 inline-flex items-center gap-1 bg-white/25 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            ⚡ {xpValue} XP
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {children}
      </div>

      {/* ── Footer ── */}
      <BrandFooter />
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────────

// CardBack — back face of the 3D flip: explanation + optional result summary + Next
function CardBack({
  explanation,
  fallback,
  resultSummary,
  onNext,
}: {
  explanation?: string;
  fallback?: string;
  resultSummary?: React.ReactNode;
  onNext: () => void;
}) {
  const content = (explanation || fallback || "").trim();
  const hasContent = stripHtml(content).length > 0;
  return (
    <>
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest">
          Explanation
        </p>
      </div>
      <div className="flex-1 px-6 sm:px-8 py-5 space-y-4 overflow-y-auto">
        {resultSummary}
        {hasContent ? (
          <SafeHtml html={content} className="text-sm text-gray-700 leading-relaxed" />
        ) : (
          <p className="text-sm text-gray-400 italic">No explanation provided.</p>
        )}
      </div>
      <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 shrink-0">
        <button
          onClick={onNext}
          className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
        >
          Next Card →
        </button>
      </div>
    </>
  );
}

// CardFlip — 3D perspective wrapper
// Renders front and back faces with rotateY flip animation.
// front: the interaction face; back: the explanation face.
//
// Height strategy: outer div is flex:1 + position:relative (becomes the
// containing block). Rotating div uses position:absolute + inset:0 to fill it —
// avoiding height:100% which fails when the parent's height is flex-computed
// rather than explicitly declared.
function CardFlip({
  flipped,
  front,
  back,
}: {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}) {
  return (
    <div style={{ flex: 1, perspective: "1200px", position: "relative" }}>
      {/* Rotating container — fills outer div via absolute positioning */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 420ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Front face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            backgroundColor: "white",
            pointerEvents: flipped ? "none" : "auto",
          }}
        >
          {front}
        </div>

        {/* Back face — pre-rotated 180° so it faces forward when container flips */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            backgroundColor: "white",
            pointerEvents: flipped ? "auto" : "none",
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

function FlipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full border-2 border-dashed text-sm font-semibold py-2.5 rounded-xl transition-opacity hover:opacity-75"
      style={{
        borderColor: "var(--fc-accent, #6D4BCB)",
        color: "var(--fc-accent, #6D4BCB)",
      }}
    >
      📖 Flip for Explanation
    </button>
  );
}

function TryAgainButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
    >
      ↩ Try Again
    </button>
  );
}

function ResultBadge({ correct, label }: { correct: boolean; label: string }) {
  return (
    <div
      className={`text-center text-sm font-semibold py-2.5 rounded-xl ${
        correct ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {label}
    </div>
  );
}

// Optional instruction line — renders only when text is present
function InstructionLine({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <p className="text-[11px] text-gray-500 italic mt-1.5 leading-relaxed">{text}</p>
  );
}

// ── TITLE card ────────────────────────────────────────────────────────────────
function TitleCard({
  card,
  deckSubtitle,
  onNext,
}: {
  card: FlashCard;
  deckSubtitle: string | null;
  onNext: () => void;
}) {
  const c = card.content as TitleContent | null;
  const title = c?.titleOverride?.trim() || stripHtml(card.front) || "Flashcard Section";
  const subtitle = c?.subtitle?.trim() || deckSubtitle;
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12"
      style={{ backgroundColor: "var(--fc-cover-bg, #2D1B69)" }}
    >
      <p className="text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-5">
        Section
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-purple-200 text-sm leading-relaxed max-w-xs">{subtitle}</p>
      )}
      <button
        onClick={onNext}
        className="mt-8 bg-white text-[#2D1B69] text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-purple-50 transition-colors"
      >
        Start →
      </button>
    </div>
  );
}

// ── INFO card ─────────────────────────────────────────────────────────────────
function InfoCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as InfoContent | null;
  const title = c?.title?.trim() || stripHtml(card.front);
  const body = c?.body || "";
  const keyPoints = c?.keyPoints?.filter(Boolean) ?? [];
  const example = c?.example;
  const hasBack = stripHtml(card.back).length > 0;
  const [showBack, setShowBack] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">Info</p>
        {title && (
          <h3 className="text-base sm:text-lg font-bold text-[#2D1B69] leading-snug">{title}</h3>
        )}
      </div>

      <div className="flex-1 px-6 sm:px-8 py-5 space-y-4 overflow-y-auto">
        {body ? (
          <SafeHtml html={body} className="text-sm leading-relaxed text-gray-700" />
        ) : (
          <p className="text-sm text-gray-400 italic">No content for this card.</p>
        )}

        {example && (
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
              Example
            </p>
            <p className="text-sm text-blue-800 leading-relaxed">{example}</p>
          </div>
        )}

        {keyPoints.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 mb-2">
              Key Points
            </p>
            <ul className="space-y-1.5">
              {keyPoints.map((kp, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-yellow-500 shrink-0 mt-0.5">•</span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasBack && !showBack && (
          <button
            onClick={() => setShowBack(true)}
            className="fc-accent-text text-xs hover:underline mt-1"
          >
            Show additional notes
          </button>
        )}
        {hasBack && showBack && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-2">
              Additional Notes
            </p>
            <SafeHtml html={card.back} className="text-sm text-[#2D1B69] leading-relaxed" />
          </div>
        )}
      </div>

      <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100">
        <button
          onClick={onNext}
          className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── QUIZ card ─────────────────────────────────────────────────────────────────
// Flow: question + options → Submit → right/wrong reveal → Flip → explanation
function QuizCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as QuizContent | null;
  const question = c?.question ?? card.front;
  const options = c?.options ?? [];
  const explanation = c?.explanation ?? card.back;
  const correctIndex = options.findIndex((o) => o.isCorrect);

  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  function optionBg(i: number): string {
    if (!submitted) return i === selected ? "bg-purple-50" : "hover:bg-purple-50/30";
    if (i === correctIndex) return "bg-green-50";
    if (i === selected && i !== correctIndex) return "bg-red-50";
    return "opacity-60";
  }
  function optionBorder(i: number): React.CSSProperties {
    if (!submitted) {
      return i === selected ? { borderColor: "var(--fc-accent, #6D4BCB)" } : {};
    }
    if (i === correctIndex) return { borderColor: "#22c55e" };
    if (i === selected && i !== correctIndex) return { borderColor: "#ef4444" };
    return {};
  }
  function optionTextClass(i: number): string {
    if (!submitted) return i === selected ? "text-[#2D1B69] font-medium" : "text-gray-800";
    if (i === correctIndex) return "text-green-700 font-medium";
    if (i === selected && i !== correctIndex) return "text-red-600";
    return "text-gray-500";
  }

  const isCorrect = selected === correctIndex;

  const resultSummary = submitted ? (
    isCorrect ? (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-green-700">✅ You selected the correct answer.</p>
      </div>
    ) : (
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1.5">
          Correct Answer
        </p>
        <p className="text-sm text-blue-800">{options[correctIndex]?.text}</p>
      </div>
    )
  ) : null;

  return (
    <CardFlip
      flipped={flipped}
      front={
        <>
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Question
            </p>
            <SafeHtml
              html={question}
              className="text-sm sm:text-base font-medium text-gray-800 leading-relaxed"
            />
          </div>

          <div className="flex-1 px-6 sm:px-8 py-5 space-y-2.5 overflow-y-auto">
            {options.map((opt, i) => (
              <button
                key={i}
                disabled={submitted}
                onClick={() => !submitted && setSelected(i)}
                className={`w-full text-left rounded-xl border-2 border-gray-200 px-4 sm:px-5 py-3 text-sm transition-all ${optionBg(i)}`}
                style={optionBorder(i)}
              >
                <span className="font-semibold text-gray-400 mr-2.5">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span className={optionTextClass(i)}>{opt.text}</span>
                {submitted && i === correctIndex && (
                  <span className="ml-2 text-green-600 font-bold">✓</span>
                )}
                {submitted && i === selected && i !== correctIndex && (
                  <span className="ml-2 text-red-500 font-bold">✗</span>
                )}
              </button>
            ))}
          </div>

          <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3 shrink-0">
            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                disabled={selected === null}
                className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Submit Answer
              </button>
            ) : (
              <>
                <ResultBadge correct={isCorrect} label={isCorrect ? "✅ Correct!" : "❌ Incorrect"} />
                <FlipButton onClick={() => setFlipped(true)} />
              </>
            )}
          </div>
        </>
      }
      back={
        <CardBack
          explanation={explanation}
          resultSummary={resultSummary}
          onNext={onNext}
        />
      }
    />
  );
}

// ── FILL IN THE BLANK card ────────────────────────────────────────────────────
// Flow: prompt + input → Check → result → Flip → explanation
function FillInBlankCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as FillInBlankContent | null;
  const sentence = c?.sentence ?? stripHtml(card.front);
  const accepted = c?.blanks?.[0]?.accepted ?? [];
  const explanation = c?.explanation ?? card.back;
  const instruction = c?.instruction;

  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [flipped, setFlipped] = useState(false);

  function handleCheck() {
    const ok = accepted.some(
      (a) => a.trim().toLowerCase() === answer.trim().toLowerCase(),
    );
    setCorrect(ok);
    setSubmitted(true);
  }

  const parts = sentence.split("___");
  const before = parts[0] ?? "";
  const after = parts.slice(1).join("___");

  const resultSummary = submitted && !correct ? (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1.5">
        Accepted Answer{accepted.length > 1 ? "s" : ""}
      </p>
      <p className="text-sm text-blue-800">{accepted.join(" / ")}</p>
    </div>
  ) : submitted && correct ? (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
      <p className="text-sm font-semibold text-green-700">✅ You got it right!</p>
    </div>
  ) : null;

  return (
    <CardFlip
      flipped={flipped}
      front={
        <>
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
            <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
              Fill in the Blank
            </p>
            <InstructionLine text={instruction} />
            <p className="mt-2 text-sm sm:text-base font-medium text-gray-800 leading-relaxed">
              {before}
              {submitted ? (
                <span className="font-bold text-green-700 bg-green-100 rounded px-2 mx-0.5">
                  {accepted[0] ?? "?"}
                </span>
              ) : (
                <span
                  className="inline-block border-b-2 mx-1 w-24 text-center align-bottom font-semibold"
                  style={{
                    borderBottomColor: "var(--fc-accent, #6D4BCB)",
                    color: "var(--fc-accent, #6D4BCB)",
                  }}
                >
                  {answer || "___"}
                </span>
              )}
              {after}
            </p>
          </div>

          <div className="flex-1 px-6 sm:px-8 py-5 overflow-y-auto">
            {!submitted && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && answer.trim() && handleCheck()}
                  placeholder="Type your answer…"
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--fc-accent, #6D4BCB)")
                  }
                  onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                />
                <button
                  onClick={handleCheck}
                  disabled={!answer.trim()}
                  className="fc-accent-btn text-white text-sm font-semibold px-5 py-2.5 rounded-xl shrink-0"
                >
                  Check
                </button>
              </div>
            )}
          </div>

          {submitted && (
            <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3 shrink-0">
              <ResultBadge
                correct={correct}
                label={correct ? "✅ Correct!" : `❌ Accepted: ${accepted.join(", ")}`}
              />
              <FlipButton onClick={() => setFlipped(true)} />
            </div>
          )}
        </>
      }
      back={
        <CardBack
          explanation={explanation}
          resultSummary={resultSummary}
          onNext={onNext}
        />
      }
    />
  );
}

// ── REORDER card ──────────────────────────────────────────────────────────────
// Flow: drag-and-drop rows → Submit → green/red per item →
//       Try Again (if wrong) + Flip → explanation
function ReorderCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as ReorderContent | null;
  const correctOrder = c?.items ?? [];
  const explanation = c?.explanation ?? card.back;
  const instruction =
    c?.instruction || stripHtml(card.front) || "Arrange items in the correct order";

  const [items, setItems] = useState<string[]>(() =>
    [...correctOrder].sort(() => Math.random() - 0.5),
  );
  const [submitted, setSubmitted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Refs to each row DOM element and to track which row we're dragging from
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragFromRef = useRef<number | null>(null);

  const res: boolean[] = submitted
    ? items.map((item, i) => item === correctOrder[i])
    : [];
  const allCorrect = submitted && res.length > 0 && res.every(Boolean);
  const correctCount = res.filter(Boolean).length;

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>, i: number) {
    if (submitted) return;
    e.preventDefault();
    // Capture pointer on the handle so pointermove/up fire here even when cursor leaves
    e.currentTarget.setPointerCapture(e.pointerId);
    dragFromRef.current = i;
    setDragIdx(i);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragFromRef.current === null) return;
    const y = e.clientY;
    for (let j = 0; j < rowRefs.current.length; j++) {
      const el = rowRefs.current[j];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        const from = dragFromRef.current;
        if (j !== from) {
          setItems((prev) => {
            const next = [...prev];
            const [removed] = next.splice(from, 1);
            next.splice(j, 0, removed);
            return next;
          });
          dragFromRef.current = j;
          setDragIdx(j);
        }
        break;
      }
    }
  }

  function onHandlePointerUp() {
    dragFromRef.current = null;
    setDragIdx(null);
  }

  function handleTryAgain() {
    setSubmitted(false);
    setFlipped(false);
    setItems([...correctOrder].sort(() => Math.random() - 0.5));
  }

  const resultSummary = (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">
        Correct Order
      </p>
      <ol className="space-y-1">
        {correctOrder.map((item, i) => (
          <li key={i} className="text-sm text-blue-800 flex gap-2">
            <span className="font-bold text-blue-400 shrink-0">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <CardFlip
      flipped={flipped}
      front={
        <>
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
            <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
              Reorder
            </p>
            <p className="text-sm font-medium text-gray-700 leading-snug mt-1">{instruction}</p>
            {!submitted && (
              <p className="text-[10px] text-gray-400 mt-1 italic">
                Drag rows into the correct order, then submit
              </p>
            )}
          </div>

          <div className="flex-1 px-6 sm:px-8 py-5 space-y-2 overflow-y-auto">
            {items.map((item, i) => (
              <div
                key={item + i}
                ref={(el) => { rowRefs.current[i] = el; }}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-sm transition-all select-none ${
                  !submitted
                    ? dragIdx === i
                      ? "border-[color:var(--fc-accent,#6D4BCB)] bg-purple-50 shadow-md scale-[1.01]"
                      : "border-gray-200 bg-gray-50"
                    : res[i]
                    ? "border-green-400 bg-green-50"
                    : "border-red-400 bg-red-50"
                }`}
              >
                {!submitted && (
                  <div
                    className="shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing px-1 py-0.5 rounded"
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => onHandlePointerDown(e, i)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                    aria-label="Drag to reorder"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="7" cy="5" r="1.5" />
                      <circle cx="13" cy="5" r="1.5" />
                      <circle cx="7" cy="10" r="1.5" />
                      <circle cx="13" cy="10" r="1.5" />
                      <circle cx="7" cy="15" r="1.5" />
                      <circle cx="13" cy="15" r="1.5" />
                    </svg>
                  </div>
                )}
                <span className="w-5 text-center text-xs font-bold text-gray-400 shrink-0">
                  {i + 1}
                </span>
                <span
                  className={`flex-1 font-medium ${
                    !submitted ? "text-gray-800" : res[i] ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {item}
                </span>
                {submitted && (
                  <span className="text-base shrink-0 font-bold">
                    {res[i] ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3 shrink-0">
            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Submit Order
              </button>
            ) : (
              <>
                <ResultBadge
                  correct={allCorrect}
                  label={
                    allCorrect
                      ? "✅ Perfect order!"
                      : `${correctCount} of ${items.length} in the right position`
                  }
                />
                {!allCorrect && <TryAgainButton onClick={handleTryAgain} />}
                <FlipButton onClick={() => setFlipped(true)} />
              </>
            )}
          </div>
        </>
      }
      back={
        <CardBack
          explanation={explanation}
          resultSummary={resultSummary}
          onNext={onNext}
        />
      }
    />
  );
}

// ── MATCHING card ─────────────────────────────────────────────────────────────
// Flow: left fixed, right dropdown per row → Submit → correct/wrong →
//       Try Again (if wrong) + Flip → explanation
function MatchingCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as MatchingContent | null;
  const pairs = c?.pairs ?? [];
  const explanation = c?.explanation ?? card.back;
  const instruction =
    c?.instruction || stripHtml(card.front) || "Match each item on the left to the right";

  const shuffledRights = useMemo(
    () => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selections, setSelections] = useState<string[]>(() => pairs.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const results: boolean[] = submitted
    ? pairs.map((p, i) => selections[i] === p.right)
    : [];
  const allCorrect = submitted && results.length > 0 && results.every(Boolean);
  const correctCount = results.filter(Boolean).length;

  function handleTryAgain() {
    setSelections(pairs.map(() => ""));
    setSubmitted(false);
    setFlipped(false);
  }

  const resultSummary = (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">
        Correct Pairs
      </p>
      <div className="space-y-1.5">
        {pairs.map((pair, i) => (
          <div key={i} className="text-sm text-blue-800 flex items-center gap-2">
            <span className="font-medium">{pair.left}</span>
            <span className="text-blue-300 shrink-0">→</span>
            <span>{pair.right}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <CardFlip
      flipped={flipped}
      front={
        <>
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
            <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
              Matching
            </p>
            <InstructionLine text={instruction} />
          </div>

          <div className="flex-1 px-6 sm:px-8 py-5 space-y-3 overflow-y-auto">
            {pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 text-sm text-gray-800 font-medium">
                  {pair.left}
                </div>
                <span className="text-gray-400 font-bold shrink-0 text-xs">→</span>
                <div className="flex-1 min-w-0">
                  {submitted ? (
                    <div
                      className={`rounded-xl border-2 px-3 sm:px-4 py-2.5 text-sm font-medium ${
                        results[i]
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-red-400 bg-red-50 text-red-600"
                      }`}
                    >
                      <span className="block truncate">{selections[i] || "—"}</span>
                      {!results[i] && (
                        <span className="text-[10px] text-green-600 block mt-0.5">
                          ✓ {pair.right}
                        </span>
                      )}
                    </div>
                  ) : (
                    <select
                      value={selections[i]}
                      onChange={(e) => {
                        const next = [...selections];
                        next[i] = e.target.value;
                        setSelections(next);
                      }}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none appearance-none cursor-pointer"
                      style={
                        selections[i] ? { borderColor: "var(--fc-accent, #6D4BCB)" } : undefined
                      }
                    >
                      <option value="">Select…</option>
                      {shuffledRights.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3 shrink-0">
            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                disabled={selections.some((s) => !s)}
                className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Submit Matches
              </button>
            ) : (
              <>
                <ResultBadge
                  correct={allCorrect}
                  label={
                    allCorrect
                      ? "✅ All matches correct!"
                      : `${correctCount} of ${pairs.length} correct`
                  }
                />
                {!allCorrect && <TryAgainButton onClick={handleTryAgain} />}
                <FlipButton onClick={() => setFlipped(true)} />
              </>
            )}
          </div>
        </>
      }
      back={
        <CardBack
          explanation={explanation}
          resultSummary={resultSummary}
          onNext={onNext}
        />
      }
    />
  );
}

// ── CATEGORIZATION card ───────────────────────────────────────────────────────
// Flow: drag chips into category drop-zones → Submit → green/red →
//       Try Again (if wrong) + Flip → explanation
function CategorizationCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as CategorizationContent | null;
  const items = c?.items ?? [];
  const categories = c?.categories ?? [];
  const explanation = c?.explanation ?? card.back;
  const instruction =
    c?.instruction || stripHtml(card.front) || "Drag each item into its correct category";

  // assignments[i] = category name, or "" = unassigned
  const [assignments, setAssignments] = useState<string[]>(() => items.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Ghost div that follows the pointer (updated via ref, not state, for smooth motion)
  const ghostRef = useRef<HTMLDivElement>(null);
  // Refs to each category drop-zone element
  const catRefs = useRef<Map<string, HTMLElement>>(new Map());
  // Ref to the unassigned pool element
  const poolRef = useRef<HTMLDivElement>(null);
  // Track dragging index in a ref too (for pointer handlers that close over stale state)
  const draggingIdxRef = useRef<number | null>(null);

  const results: boolean[] = submitted
    ? items.map((item, i) => assignments[i] === item.category)
    : [];
  const allCorrect = submitted && results.length > 0 && results.every(Boolean);
  const correctCount = results.filter(Boolean).length;
  const unassignedCount = assignments.filter((a) => !a).length;
  const allAssigned = items.length > 0 && unassignedCount === 0;

  function showGhost(text: string, x: number, y: number) {
    const g = ghostRef.current;
    if (!g) return;
    g.textContent = text;
    g.style.left = x - 40 + "px";
    g.style.top = y - 16 + "px";
    g.style.display = "block";
  }

  function moveGhost(x: number, y: number) {
    const g = ghostRef.current;
    if (!g) return;
    g.style.left = x - 40 + "px";
    g.style.top = y - 16 + "px";
  }

  function hideGhost() {
    const g = ghostRef.current;
    if (g) g.style.display = "none";
  }

  function findDropTarget(x: number, y: number): { type: "cat"; name: string } | { type: "pool" } | null {
    for (const [cat, el] of catRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { type: "cat", name: cat };
      }
    }
    if (poolRef.current) {
      const r = poolRef.current.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { type: "pool" };
      }
    }
    return null;
  }

  function onItemPointerDown(e: React.PointerEvent<HTMLDivElement>, idx: number) {
    if (submitted) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingIdxRef.current = idx;
    setDraggingIdx(idx);
    showGhost(items[idx]?.text ?? "", e.clientX, e.clientY);
  }

  function onItemPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (draggingIdxRef.current === null) return;
    moveGhost(e.clientX, e.clientY);
  }

  function onItemPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const idx = draggingIdxRef.current;
    if (idx === null) return;
    hideGhost();
    draggingIdxRef.current = null;
    setDraggingIdx(null);

    const target = findDropTarget(e.clientX, e.clientY);
    if (target?.type === "cat") {
      setAssignments((prev) => {
        const next = [...prev];
        next[idx] = target.name;
        return next;
      });
    } else if (target?.type === "pool") {
      setAssignments((prev) => {
        const next = [...prev];
        next[idx] = "";
        return next;
      });
    }
    // If no valid target: item stays in place (no change)
  }

  function handleTryAgain() {
    setAssignments(items.map(() => ""));
    setSubmitted(false);
    setFlipped(false);
  }

  const resultSummary = (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">
        Correct Categories
      </p>
      {categories.map((cat) => {
        const catItems = items.filter((item) => item.category === cat);
        return (
          <div key={cat} className="mb-2 last:mb-0">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
              {cat}
            </p>
            <p className="text-sm text-blue-800">{catItems.map((i) => i.text).join(", ")}</p>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Ghost element — fixed position, follows pointer, above everything */}
      <div
        ref={ghostRef}
        className="fixed z-50 px-3 py-1.5 rounded-xl text-sm font-medium shadow-xl pointer-events-none"
        style={{
          display: "none",
          border: "2px solid var(--fc-accent, #6D4BCB)",
          color: "var(--fc-accent, #6D4BCB)",
          backgroundColor: "white",
          maxWidth: "180px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: 0.92,
        }}
      />

      <CardFlip
        flipped={flipped}
        front={
          <div style={{ userSelect: "none", display: "flex", flexDirection: "column", flex: 1 }}>
            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
                Categorization
              </p>
              <p className="text-sm font-medium text-gray-700 leading-snug mt-1">{instruction}</p>
              {!submitted && (
                <p className="text-[10px] text-gray-400 mt-1 italic">
                  Drag chips into the correct category boxes
                </p>
              )}
            </div>

            <div className="flex-1 px-6 sm:px-8 py-5 overflow-y-auto space-y-3">
              {categories.map((cat) => {
                const catItems = items
                  .map((item, i) => ({ item, i }))
                  .filter(({ i }) => assignments[i] === cat);
                const isHighlighted = draggingIdx !== null;
                return (
                  <div
                    key={cat}
                    ref={(el) => { if (el) catRefs.current.set(cat, el); }}
                    className={`rounded-xl border-2 p-3 min-h-[72px] transition-colors ${
                      submitted
                        ? "border-gray-200 bg-gray-50"
                        : isHighlighted
                        ? "border-[color:var(--fc-accent,#6D4BCB)] bg-purple-50/40"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mb-2"
                      style={{ color: "var(--fc-accent, #6D4BCB)" }}
                    >
                      {cat}
                    </p>
                    <div className="flex flex-wrap gap-2 min-h-[28px]">
                      {catItems.map(({ item, i }) => {
                        const isCorrect = submitted ? results[i] : null;
                        return (
                          <div
                            key={i}
                            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                              submitted
                                ? isCorrect
                                  ? "border-green-400 bg-green-50 text-green-700"
                                  : "border-red-400 bg-red-50 text-red-600"
                                : draggingIdx === i
                                ? "opacity-40 border-dashed border-gray-300 bg-gray-100 text-gray-400 cursor-grabbing"
                                : "border-gray-300 bg-white text-gray-700 cursor-grab"
                            }`}
                            style={{ touchAction: "none" }}
                            onPointerDown={submitted ? undefined : (e) => onItemPointerDown(e, i)}
                            onPointerMove={submitted ? undefined : onItemPointerMove}
                            onPointerUp={submitted ? undefined : onItemPointerUp}
                          >
                            {item.text}
                            {submitted && !isCorrect && (
                              <span className="block text-[9px] text-green-600 mt-0.5">
                                ✓ {item.category}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!submitted && (
                <div
                  ref={poolRef}
                  className={`rounded-xl border-2 border-dashed p-3 min-h-[60px] transition-colors ${
                    draggingIdx !== null && assignments[draggingIdx] !== ""
                      ? "border-gray-400 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Unassigned {unassignedCount > 0 ? `(${unassignedCount})` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 min-h-[28px]">
                    {items.map((item, i) => {
                      if (assignments[i]) return null;
                      return (
                        <div
                          key={i}
                          className={`px-3 py-1.5 rounded-lg border-2 border-dashed text-sm font-medium cursor-grab ${
                            draggingIdx === i
                              ? "opacity-40 border-gray-300 bg-gray-100 text-gray-400 cursor-grabbing"
                              : "border-gray-300 bg-white text-gray-600"
                          }`}
                          style={{ touchAction: "none" }}
                          onPointerDown={(e) => onItemPointerDown(e, i)}
                          onPointerMove={onItemPointerMove}
                          onPointerUp={onItemPointerUp}
                        >
                          {item.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3 shrink-0">
              {!submitted ? (
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={!allAssigned}
                  className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40"
                >
                  {allAssigned ? "Submit" : `Submit (${unassignedCount} unassigned)`}
                </button>
              ) : (
                <>
                  <ResultBadge
                    correct={allCorrect}
                    label={
                      allCorrect
                        ? "✅ All categorized correctly!"
                        : `${correctCount} of ${items.length} correct`
                    }
                  />
                  {!allCorrect && <TryAgainButton onClick={handleTryAgain} />}
                  <FlipButton onClick={() => setFlipped(true)} />
                </>
              )}
            </div>
          </div>
        }
        back={
          <CardBack
            explanation={explanation}
            resultSummary={resultSummary}
            onNext={onNext}
          />
        }
      />
    </>
  );
}

// ── Fallback cards ────────────────────────────────────────────────────────────
function EmptyCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        {card.cardType}
      </p>
      <p className="text-gray-400 text-sm italic">This card has no content yet.</p>
      <button
        onClick={onNext}
        className="fc-accent-btn mt-6 text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
      >
        Next →
      </button>
    </div>
  );
}

function UnsupportedCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        {card.cardType}
      </p>
      <p className="text-gray-500 text-sm">Card type not yet supported in student view.</p>
      <button
        onClick={onNext}
        className="fc-accent-btn mt-6 text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
      >
        Next →
      </button>
    </div>
  );
}

// ── Card dispatcher ───────────────────────────────────────────────────────────
function CardRenderer({
  card,
  deckSubtitle,
  onNext,
}: {
  card: FlashCard;
  deckSubtitle: string | null;
  onNext: () => void;
}) {
  const type = (card.cardType ?? "").toUpperCase();
  const hasContent =
    (card.content != null && Object.keys(card.content as object).length > 0) ||
    card.front?.trim() ||
    card.back?.trim();

  if (!hasContent && type !== "TITLE") return <EmptyCard card={card} onNext={onNext} />;

  switch (type) {
    case "TITLE":
      return <TitleCard card={card} deckSubtitle={deckSubtitle} onNext={onNext} />;
    case "INFO":
      return <InfoCard card={card} onNext={onNext} />;
    case "QUIZ":
      return <QuizCard card={card} onNext={onNext} />;
    case "FILL_IN_BLANK":
      return <FillInBlankCard card={card} onNext={onNext} />;
    case "REORDER":
      return <ReorderCard card={card} onNext={onNext} />;
    case "MATCHING":
      return <MatchingCard card={card} onNext={onNext} />;
    case "CATEGORIZATION":
      return <CategorizationCard card={card} onNext={onNext} />;
    default:
      return <UnsupportedCard card={card} onNext={onNext} />;
  }
}

// ── Main player export ────────────────────────────────────────────────────────
interface Props {
  deckId: string;
  deckTitle: string;
  deckSubtitle: string | null;
  subject: string | null;
  xpEnabled: boolean;
  xpValue: number;
  cards: FlashCard[];
  subjectColor: string | null;
}

export default function FlashcardStudyClient({
  deckId,
  deckTitle,
  deckSubtitle,
  subject,
  xpEnabled,
  xpValue,
  cards,
  subjectColor,
}: Props) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [xpAlreadyEarned, setXpAlreadyEarned] = useState(false);
  const celebrationFiredRef = useRef(false);
  const xpCommitCalledRef = useRef(false);

  const total = cards.length;
  const card = cards[index];

  const commitXp = useCallback(async () => {
    if (xpCommitCalledRef.current) return;
    xpCommitCalledRef.current = true;
    try {
      const res = await fetch("/api/student/flashcards/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId }),
      });
      if (!res.ok) return;
      const data = await res.json() as { xpAwarded: number; alreadyAwarded: boolean };
      setXpAwarded(data.xpAwarded);
      setXpAlreadyEarned(data.alreadyAwarded);
      if (data.xpAwarded > 0 && !celebrationFiredRef.current) {
        celebrationFiredRef.current = true;
        triggerXpCelebration();
      }
    } catch {
    }
  }, [deckId]);

  function handleNext() {
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
      commitXp();
    }
  }
  function handlePrev() {
    if (index > 0) setIndex((i) => i - 1);
  }
  function handleRestart() {
    setIndex(0);
    setDone(false);
  }

  // Root element sets CSS custom properties; all descendants inherit them
  const cssVars = accentVars(subjectColor);

  if (total === 0) {
    return (
      <div className="flex-grow flex items-center justify-center py-20 text-center">
        <div>
          <p className="text-gray-400 font-medium mb-1">This deck has no cards yet</p>
          <Link href={ROUTES.flashcards} className="fc-accent-text text-sm hover:underline">
            ← Back to decks
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex-grow flex items-center justify-center py-20 px-4" style={cssVars}>
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D1B69] mb-2">Deck complete!</h2>
          <p className="text-gray-500 text-sm mb-2">
            You reviewed all {total} cards in{" "}
            <span className="font-medium">{deckTitle}</span>.
          </p>
          {xpEnabled && xpValue > 0 && (
            <div className="mb-6">
              {xpAwarded === null && (
                <p className="fc-accent-text text-sm font-semibold">⚡ Saving XP…</p>
              )}
              {xpAwarded !== null && xpAwarded > 0 && (
                <p className="fc-accent-text text-sm font-semibold">⚡ You earned {xpAwarded} XP!</p>
              )}
              {xpAwarded !== null && xpAlreadyEarned && (
                <p className="text-gray-400 text-sm">XP already earned for this deck.</p>
              )}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="fc-accent-btn text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Study Again
            </button>
            <Link
              href={ROUTES.flashcards}
              className="bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              All Decks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Root sets --fc-accent and --fc-cover-bg for all card sub-components
    <div
      className="flex-grow flex flex-col items-center py-6 sm:py-10 px-3 sm:px-6"
      style={cssVars}
    >
      {/* Progress indicator */}
      <div className="w-full max-w-3xl mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">
            Card {index + 1} / {total}
          </span>
          <span className="fc-accent-text text-[10px] font-bold uppercase tracking-widest">
            {card.cardType}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="fc-accent-bar h-full rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card shell — key resets all internal state when the card changes */}
      <CardShell subject={subject} xpEnabled={xpEnabled} xpValue={xpValue}>
        <CardRenderer
          key={card.id}
          card={card}
          deckSubtitle={deckSubtitle}
          onNext={handleNext}
        />
      </CardShell>

      {/* Previous card navigation */}
      {index > 0 && (
        <button
          onClick={handlePrev}
          className="fc-accent-text mt-5 text-sm hover:underline flex items-center gap-1"
        >
          ← Previous card
        </button>
      )}
    </div>
  );
}

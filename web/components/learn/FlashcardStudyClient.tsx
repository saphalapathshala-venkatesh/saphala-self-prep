"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import type { FlashCard } from "@/lib/contentDb";
import { BRAND, ROUTES } from "@/config/terminology";
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
    <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-[0_6px_32px_rgba(0,0,0,0.12)] border border-black/5 flex flex-col min-h-[540px] sm:min-h-[600px]">
      {/* ── Header ≈ 10% ── */}
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
              Complete deck of Flash cards to earn {xpValue} XP
            </p>
          )}
        </div>
        {showXp && (
          <span className="ml-3 shrink-0 inline-flex items-center gap-1 bg-white/25 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            ⚡ {xpValue} XP
          </span>
        )}
      </div>

      {/* ── Content — grows to fill available space ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {children}
      </div>

      {/* ── Footer ≈ 10% ── */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-t border-gray-100 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            {BRAND.name}
          </span>
          <span className="text-gray-300 text-xs shrink-0">·</span>
          <span className="text-[9px] text-gray-400 italic truncate">{BRAND.tagline}</span>
        </div>
        <span className="ml-2 shrink-0 text-[9px] font-bold text-gray-300">SP</span>
      </div>
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────────

// Explanation panel that slides in after "Flip for Explanation" is clicked
function ExplReveal({
  html,
  fallback,
  onNext,
}: {
  html?: string;
  fallback?: string;
  onNext: () => void;
}) {
  const content = (html || fallback || "").trim();
  const hasContent = stripHtml(content).length > 0;
  return (
    <div className="border-t-2 border-amber-200 bg-amber-50/60 px-6 sm:px-8 py-5 space-y-4">
      <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest">
        Explanation
      </p>
      {hasContent ? (
        <SafeHtml html={content} className="text-sm text-gray-700 leading-relaxed" />
      ) : (
        <p className="text-sm text-gray-400 italic">No explanation provided.</p>
      )}
      <button
        onClick={onNext}
        className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
      >
        Next Card →
      </button>
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

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Question
        </p>
        <SafeHtml
          html={question}
          className="text-sm sm:text-base font-medium text-gray-800 leading-relaxed"
        />
      </div>

      <div className="flex-1 px-6 sm:px-8 py-5 space-y-2.5">
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

      <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={selected === null}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Submit Answer
          </button>
        ) : !flipped ? (
          <>
            <ResultBadge correct={isCorrect} label={isCorrect ? "✅ Correct!" : "❌ Incorrect"} />
            <FlipButton onClick={() => setFlipped(true)} />
          </>
        ) : (
          <ExplReveal html={explanation} onNext={onNext} />
        )}
      </div>
    </div>
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

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
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

      <div className="flex-1 px-6 sm:px-8 py-5 space-y-4">
        {!submitted ? (
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
        ) : !flipped ? (
          <>
            <ResultBadge
              correct={correct}
              label={correct ? "✅ Correct!" : `❌ Accepted: ${accepted.join(", ")}`}
            />
            <FlipButton onClick={() => setFlipped(true)} />
          </>
        ) : (
          <ExplReveal html={explanation} onNext={onNext} />
        )}
      </div>
    </div>
  );
}

// ── REORDER card ──────────────────────────────────────────────────────────────
// Flow: shuffled items with ▲/▼ buttons → Submit → green/red per item →
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

  const results: boolean[] = submitted
    ? items.map((item, i) => item === correctOrder[i])
    : [];
  const allCorrect = submitted && results.length > 0 && results.every(Boolean);
  const correctCount = results.filter(Boolean).length;

  function move(i: number, dir: -1 | 1) {
    if (submitted) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function handleTryAgain() {
    setSubmitted(false);
    setFlipped(false);
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
          Reorder
        </p>
        <p className="text-sm font-medium text-gray-700 leading-snug mt-1">{instruction}</p>
        {!submitted && (
          <p className="text-[10px] text-gray-400 mt-1 italic">
            Use ▲ / ▼ to arrange, then submit
          </p>
        )}
      </div>

      <div className="flex-1 px-6 sm:px-8 py-5 space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-all ${
              !submitted
                ? "border-gray-200 bg-gray-50"
                : results[i]
                ? "border-green-400 bg-green-50"
                : "border-red-400 bg-red-50"
            }`}
          >
            <span className="w-5 text-center text-xs font-bold text-gray-400 shrink-0">
              {i + 1}
            </span>
            <span
              className={`flex-1 font-medium ${
                !submitted
                  ? "text-gray-800"
                  : results[i]
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {item}
            </span>
            {submitted ? (
              <span className="text-base shrink-0 font-bold">
                {results[i] ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-500">✗</span>
                )}
              </span>
            ) : (
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1 leading-none text-sm"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1 leading-none text-sm"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Submit Order
          </button>
        ) : !flipped ? (
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
        ) : (
          <ExplReveal html={explanation} onNext={onNext} />
        )}
      </div>
    </div>
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

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
          Matching
        </p>
        <InstructionLine text={instruction} />
      </div>

      <div className="flex-1 px-6 sm:px-8 py-5 space-y-3">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            {/* Left — fixed */}
            <div className="flex-1 min-w-0 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 text-sm text-gray-800 font-medium">
              {pair.left}
            </div>

            <span className="text-gray-400 font-bold shrink-0 text-xs">→</span>

            {/* Right — dropdown or result */}
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
                    selections[i]
                      ? { borderColor: "var(--fc-accent, #6D4BCB)" }
                      : undefined
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

      <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={selections.some((s) => !s)}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Submit Matches
          </button>
        ) : !flipped ? (
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
        ) : (
          <ExplReveal html={explanation} onNext={onNext} />
        )}
      </div>
    </div>
  );
}

// ── CATEGORIZATION card ───────────────────────────────────────────────────────
// Flow: tap items to cycle through categories → Submit → green/red →
//       Try Again (if wrong) + Flip → explanation
function CategorizationCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as CategorizationContent | null;
  const items = c?.items ?? [];
  const categories = c?.categories ?? [];
  const explanation = c?.explanation ?? card.back;
  const instruction =
    c?.instruction || stripHtml(card.front) || "Categorize each item";

  const [assignments, setAssignments] = useState<string[]>(() => items.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const results: boolean[] = submitted
    ? items.map((item, i) => assignments[i] === item.category)
    : [];
  const allCorrect = submitted && results.length > 0 && results.every(Boolean);
  const correctCount = results.filter(Boolean).length;

  function cycleCategory(idx: number) {
    if (submitted || categories.length === 0) return;
    setAssignments((prev) => {
      const next = [...prev];
      const ci = categories.indexOf(prev[idx]);
      next[idx] = categories[(ci + 1) % categories.length] ?? "";
      return next;
    });
  }

  function handleTryAgain() {
    setAssignments(items.map(() => ""));
    setSubmitted(false);
    setFlipped(false);
  }

  const allAssigned = items.length > 0 && assignments.every((a) => a !== "");

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
          Categorization
        </p>
        <p className="text-sm font-medium text-gray-700 leading-snug mt-1">{instruction}</p>
        {!submitted && (
          <p className="text-[10px] text-gray-400 mt-1 italic">
            Tap each item to cycle through categories
          </p>
        )}
      </div>

      <div className="flex-1 px-6 sm:px-8 py-5">
        {/* Category legend */}
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{
                borderColor: "var(--fc-accent, #6D4BCB)",
                color: "var(--fc-accent, #6D4BCB)",
                backgroundColor: "rgba(109,75,203,0.07)",
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Items as chips */}
        <div className="flex flex-wrap gap-2.5">
          {items.map((item, i) => {
            const assigned = assignments[i];
            const isCorrect = submitted ? results[i] : null;
            return (
              <button
                key={i}
                onClick={() => cycleCategory(i)}
                disabled={submitted}
                className={`px-3.5 py-2 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                  submitted
                    ? isCorrect
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-red-400 bg-red-50 text-red-600"
                    : assigned
                    ? "border-gray-300 bg-gray-100 text-gray-700"
                    : "border-dashed border-gray-300 bg-white text-gray-400"
                }`}
              >
                <span className="block text-[9px] font-bold uppercase leading-tight mb-0.5 opacity-70">
                  {assigned || "tap to assign"}
                </span>
                {item.text}
                {submitted && !isCorrect && (
                  <span className="block text-[9px] text-green-600 mt-0.5">
                    ✓ {item.category}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-gray-100 space-y-3">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAssigned}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Submit
          </button>
        ) : !flipped ? (
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
        ) : (
          <ExplReveal html={explanation} onNext={onNext} />
        )}
      </div>
    </div>
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

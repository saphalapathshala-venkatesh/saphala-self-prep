"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FlashCard } from "@/lib/contentDb";
import { ROUTES } from "@/config/terminology";

// ── Accent CSS variable helpers ─────────────────────────────────────────────
// The player root sets --fc-accent and --fc-cover-bg as CSS custom properties.
// All descendant elements read them via CSS utility classes (fc-accent-btn,
// fc-accent-text, fc-accent-bar) or inline style references (var(--fc-accent)).
// This way there is zero prop-drilling and a single source of truth for the color.

// Fallbacks:
//   --fc-accent    → brand purple #6D4BCB   (buttons, borders, labels)
//   --fc-cover-bg  → brand navy  #2D1B69   (TITLE card background)

function accentVars(subjectColor: string | null): React.CSSProperties {
  return {
    "--fc-accent": subjectColor || "#6D4BCB",
    "--fc-cover-bg": subjectColor || "#2D1B69",
  } as React.CSSProperties;
}

// ── Safe HTML renderer ──────────────────────────────────────────────────────
function SafeHtml({ html, className }: { html: string; className?: string }) {
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

// ── Per-card content interfaces ─────────────────────────────────────────────
interface TitleContent   { titleOverride?: string; subtitle?: string }
interface InfoContent    { body?: string }
interface QuizContent    { question?: string; options?: { text: string; isCorrect: boolean }[] }
interface FillInBlankContent {
  sentence?: string;
  blanks?: { id: string; accepted: string[] }[];
  explanation?: string;
}
interface MatchingContent      { pairs?: { left: string; right: string }[]; explanation?: string }
interface ReorderContent       { items?: string[]; explanation?: string }
interface CategorizationContent {
  items?: { text: string; category: string }[];
  categories?: string[];
  explanation?: string;
}

// ── Shared footer: Next / Continue button using accent CSS class ────────────
function NextButton({ onNext, label = "Continue →" }: { onNext: () => void; label?: string }) {
  return (
    <button
      onClick={onNext}
      className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
    >
      {label}
    </button>
  );
}

// ── Explanation box shared pattern ──────────────────────────────────────────
function ExplBox({ html }: { html: string }) {
  if (!html || !stripHtml(html)) return null;
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
      <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-2">
        Explanation
      </p>
      <SafeHtml html={html} className="text-sm text-[#2D1B69]" />
    </div>
  );
}

// ── TITLE card ──────────────────────────────────────────────────────────────
function TitleCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as TitleContent | null;
  const title = c?.titleOverride ?? stripHtml(card.front);
  const subtitle = c?.subtitle;
  return (
    // --fc-cover-bg: subjectColor when set, #2D1B69 (brand navy) as fallback
    <div
      className="w-full max-w-2xl rounded-2xl p-10 text-center shadow-lg"
      style={{ backgroundColor: "var(--fc-cover-bg, #2D1B69)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300 mb-5">
        Section
      </p>
      <h2 className="text-2xl font-bold text-white leading-snug">{title}</h2>
      {subtitle && <p className="mt-3 text-purple-200 text-sm">{subtitle}</p>}
      {/* White button on accent bg is always readable regardless of accent hue */}
      <button
        onClick={onNext}
        className="mt-8 bg-white text-[#2D1B69] text-sm font-semibold px-7 py-2.5 rounded-xl hover:bg-purple-50 transition-colors"
      >
        Start →
      </button>
    </div>
  );
}

// ── INFO card ───────────────────────────────────────────────────────────────
function InfoCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as InfoContent | null;
  const body = c?.body ?? "";
  const hasBack = stripHtml(card.back).length > 0;
  const [showBack, setShowBack] = useState(false);
  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
      <div className="px-8 pt-7 pb-4 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">Info</p>
        <h3 className="text-lg font-bold text-[#2D1B69] leading-snug">{stripHtml(card.front)}</h3>
      </div>
      <div className="px-8 py-6">
        {body ? (
          <SafeHtml html={body} className="text-sm leading-relaxed text-gray-700" />
        ) : (
          <p className="text-sm text-gray-400 italic">No content body for this card.</p>
        )}
      </div>
      {hasBack && (
        <div className="px-8 pb-4">
          {showBack ? (
            <ExplBox html={card.back} />
          ) : (
            <button
              onClick={() => setShowBack(true)}
              className="fc-accent-text text-sm hover:underline"
            >
              Show explanation
            </button>
          )}
        </div>
      )}
      <div className="px-8 pb-7 flex justify-end">
        <button
          onClick={onNext}
          className="fc-accent-btn text-white text-sm font-semibold px-7 py-2.5 rounded-xl"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── QUIZ card ───────────────────────────────────────────────────────────────
function QuizCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as QuizContent | null;
  const question = c?.question ?? card.front;
  const options = c?.options ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const correctIndex = options.findIndex((o) => o.isCorrect);

  function optionClasses(i: number): string {
    if (!revealed) {
      return i === selected
        ? "border-gray-200 bg-purple-50 cursor-pointer"
        : "border-gray-200 hover:bg-purple-50/40 cursor-pointer";
    }
    if (i === correctIndex) return "border-green-500 bg-green-50";
    if (i === selected && i !== correctIndex) return "border-red-400 bg-red-50";
    return "border-gray-100 opacity-60";
  }
  function optionTextClass(i: number): string {
    if (!revealed) return i === selected ? "text-[#2D1B69] font-medium" : "text-gray-800";
    if (i === correctIndex) return "text-green-700 font-medium";
    if (i === selected && i !== correctIndex) return "text-red-600";
    return "text-gray-500";
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
      <div className="px-8 pt-7 pb-5 border-b border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Question</p>
        <SafeHtml html={question} className="text-base font-medium text-gray-800 leading-relaxed" />
      </div>
      <div className="px-8 py-5 space-y-2.5">
        {options.map((opt, i) => (
          <button
            key={i}
            disabled={revealed}
            onClick={() => !revealed && setSelected(i)}
            className={`w-full text-left rounded-xl border-2 px-5 py-3 text-sm transition-all ${optionClasses(i)}`}
            // Apply accent color to the selected border via CSS variable inline style
            style={
              !revealed && i === selected
                ? { borderColor: "var(--fc-accent, #6D4BCB)" }
                : undefined
            }
          >
            <span className="font-medium text-gray-400 mr-3">{String.fromCharCode(65 + i)}.</span>
            <span className={optionTextClass(i)}>{opt.text}</span>
            {revealed && i === correctIndex && <span className="ml-2 text-green-600">✓</span>}
            {revealed && i === selected && i !== correctIndex && (
              <span className="ml-2 text-red-500">✗</span>
            )}
          </button>
        ))}
      </div>
      <div className="px-8 pb-7 space-y-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            disabled={selected === null}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Check Answer
          </button>
        ) : (
          <>
            <ExplBox html={card.back} />
            <NextButton onNext={onNext} label="Next →" />
          </>
        )}
      </div>
    </div>
  );
}

// ── FILL IN THE BLANK card ──────────────────────────────────────────────────
function FillInBlankCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as FillInBlankContent | null;
  const sentence = c?.sentence ?? stripHtml(card.front);
  const accepted = c?.blanks?.[0]?.accepted ?? [];
  const explanation = c?.explanation ?? card.back;
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  function handleCheck() {
    const ok = accepted.some(
      (a) => a.trim().toLowerCase() === answer.trim().toLowerCase(),
    );
    setCorrect(ok);
    setRevealed(true);
  }

  const parts = sentence.split("___");
  const before = parts[0] ?? "";
  const after = parts[1] ?? "";

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
      <div className="px-8 pt-7 pb-5 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-2">
          Fill in the Blank
        </p>
        <p className="text-base font-medium text-gray-800 leading-relaxed">
          {before}
          {revealed ? (
            <span className="font-bold text-green-700 bg-green-100 rounded px-2 mx-0.5">
              {accepted[0] ?? "?"}
            </span>
          ) : (
            <span
              className="inline-block border-b-2 mx-1 w-20 text-center font-semibold"
              style={{ borderBottomColor: "var(--fc-accent, #6D4BCB)", color: "var(--fc-accent, #6D4BCB)" }}
            >
              {answer || "___"}
            </span>
          )}
          {after}
        </p>
      </div>
      <div className="px-8 py-6 space-y-4">
        {!revealed ? (
          <div className="flex gap-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && answer.trim() && handleCheck()}
              placeholder="Type your answer…"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{ "--fc-input-focus-color": "var(--fc-accent, #6D4BCB)" } as React.CSSProperties}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--fc-accent, #6D4BCB)")
              }
              onBlur={(e) => (e.currentTarget.style.borderColor = "")}
            />
            <button
              onClick={handleCheck}
              disabled={!answer.trim()}
              className="fc-accent-btn text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Check
            </button>
          </div>
        ) : (
          <>
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                correct
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              {correct ? <>✅ Correct!</> : <>❌ Not quite — accepted: {accepted.join(", ")}</>}
            </div>
            <ExplBox html={explanation} />
            <NextButton onNext={onNext} label="Next →" />
          </>
        )}
      </div>
    </div>
  );
}

// ── MATCHING card ───────────────────────────────────────────────────────────
function MatchingCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as MatchingContent | null;
  const pairs = c?.pairs ?? [];
  const explanation = c?.explanation ?? card.back;
  const [revealed, setRevealed] = useState(false);

  const shuffledRights = useMemo(
    () => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
      <div className="px-8 pt-7 pb-5 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">Matching</p>
        <h3 className="text-base font-bold text-[#2D1B69]">
          {revealed ? "Correct Matches" : "Match each item on the left to the right"}
        </h3>
      </div>
      <div className="px-8 py-6">
        {revealed ? (
          <div className="space-y-2">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-gray-800 flex-1">{p.left}</span>
                <span className="text-green-500 font-bold">→</span>
                <span className="font-medium text-green-700 flex-1 text-right">{p.right}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Items</p>
              {pairs.map((p, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800"
                >
                  {p.left}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Match to</p>
              {shuffledRights.map((r, i) => (
                <div
                  key={i}
                  className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 text-sm text-[#2D1B69]"
                >
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-8 pb-7 space-y-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Reveal Answers
          </button>
        ) : (
          <>
            <ExplBox html={explanation} />
            <NextButton onNext={onNext} label="Next →" />
          </>
        )}
      </div>
    </div>
  );
}

// ── REORDER card ────────────────────────────────────────────────────────────
function ReorderCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as ReorderContent | null;
  const items = c?.items ?? [];
  const explanation = c?.explanation ?? card.back;
  const [revealed, setRevealed] = useState(false);

  const shuffled = useMemo(
    () => [...items].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
      <div className="px-8 pt-7 pb-5 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">Reorder</p>
        <h3 className="text-base font-bold text-[#2D1B69]">{stripHtml(card.front)}</h3>
      </div>
      <div className="px-8 py-6 space-y-2">
        <p className="text-sm text-gray-500 mb-3">
          {revealed
            ? "Correct order (1 → last):"
            : "Mentally arrange these items in the correct order, then reveal:"}
        </p>
        {(revealed ? items : shuffled).map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm border transition-colors ${
              revealed
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-gray-50 border-gray-200 text-gray-800"
            }`}
          >
            {revealed && (
              <span className="text-green-600 font-bold w-5 shrink-0">{i + 1}.</span>
            )}
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="px-8 pb-7 space-y-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Reveal Order
          </button>
        ) : (
          <>
            <ExplBox html={explanation} />
            <NextButton onNext={onNext} label="Next →" />
          </>
        )}
      </div>
    </div>
  );
}

// ── CATEGORIZATION card ─────────────────────────────────────────────────────
function CategorizationCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const c = card.content as CategorizationContent | null;
  const items = c?.items ?? [];
  const categories = c?.categories ?? [];
  const explanation = c?.explanation ?? card.back;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
      <div className="px-8 pt-7 pb-5 border-b border-gray-100">
        <p className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-1">
          Categorization
        </p>
        <h3 className="text-base font-bold text-[#2D1B69]">{stripHtml(card.front)}</h3>
      </div>
      <div className="px-8 py-6">
        {!revealed ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Mentally place each item under the correct category, then reveal:
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5 text-sm text-[#2D1B69]"
                >
                  {item.text}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              {categories.map((cat, i) => (
                <div
                  key={i}
                  className="flex-1 min-h-[56px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 font-semibold uppercase tracking-wide"
                >
                  {cat}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            {categories.map((cat, ci) => (
              <div key={ci}>
                <p
                  className="fc-accent-text text-[10px] font-bold uppercase tracking-widest mb-2"
                >
                  {cat}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items
                    .filter((item) => item.category === cat)
                    .map((item, ii) => (
                      <span
                        key={ii}
                        className="bg-green-50 border border-green-200 rounded-xl px-3 py-1.5 text-sm text-green-800 font-medium"
                      >
                        {item.text}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-8 pb-7 space-y-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="fc-accent-btn w-full text-white text-sm font-semibold py-2.5 rounded-xl"
          >
            Reveal Answers
          </button>
        ) : (
          <>
            <ExplBox html={explanation} />
            <NextButton onNext={onNext} label="Next →" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Fallback cards ──────────────────────────────────────────────────────────
function EmptyCard({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm text-center py-12 px-8">
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
    <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm text-center py-12 px-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        {card.cardType}
      </p>
      <p className="text-gray-500 text-sm">
        This card type is not yet supported in student view.
      </p>
      <button
        onClick={onNext}
        className="fc-accent-btn mt-6 text-white text-sm font-semibold px-6 py-2.5 rounded-xl"
      >
        Next →
      </button>
    </div>
  );
}

// ── Card dispatcher ─────────────────────────────────────────────────────────
function CardRenderer({ card, onNext }: { card: FlashCard; onNext: () => void }) {
  const type = (card.cardType ?? "").toUpperCase();
  const isEmpty = !card.content && !card.front?.trim() && !card.back?.trim();
  if (isEmpty && type !== "TITLE") return <EmptyCard card={card} onNext={onNext} />;

  switch (type) {
    case "TITLE":        return <TitleCard card={card} onNext={onNext} />;
    case "INFO":         return <InfoCard card={card} onNext={onNext} />;
    case "QUIZ":         return <QuizCard card={card} onNext={onNext} />;
    case "FILL_IN_BLANK": return <FillInBlankCard card={card} onNext={onNext} />;
    case "MATCHING":     return <MatchingCard card={card} onNext={onNext} />;
    case "REORDER":      return <ReorderCard card={card} onNext={onNext} />;
    case "CATEGORIZATION": return <CategorizationCard card={card} onNext={onNext} />;
    default:             return <UnsupportedCard card={card} onNext={onNext} />;
  }
}

// ── Main player ─────────────────────────────────────────────────────────────
interface Props {
  deckTitle: string;
  cards: FlashCard[];
  subjectColor: string | null;
}

export default function FlashcardStudyClient({ deckTitle, cards, subjectColor }: Props) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const total = cards.length;
  const card = cards[index];

  function handleNext() {
    if (index < total - 1) setIndex((i) => i + 1);
    else setDone(true);
  }
  function handlePrev() {
    if (index > 0) setIndex((i) => i - 1);
  }
  function handleRestart() {
    setIndex(0);
    setDone(false);
  }

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

  // Root element sets --fc-accent and --fc-cover-bg for all descendants
  const cssVars = accentVars(subjectColor);

  if (done) {
    return (
      <div className="flex-grow flex items-center justify-center py-20" style={cssVars}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D1B69] mb-2">Deck complete!</h2>
          <p className="text-gray-500 text-sm mb-6">
            You reviewed all {total} cards in{" "}
            <span className="font-medium">{deckTitle}</span>.
          </p>
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
    // --fc-accent and --fc-cover-bg cascade to all card sub-components
    <div className="flex-grow flex flex-col items-center py-10 px-4" style={cssVars}>
      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">
            Card {index + 1} of {total}
          </span>
          <span className="fc-accent-text text-xs font-semibold uppercase tracking-widest">
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

      {/* Card — key forces remount (resets internal state) on card change */}
      <CardRenderer key={card.id} card={card} onNext={handleNext} />

      {/* Previous navigation */}
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

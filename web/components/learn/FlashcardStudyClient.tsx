"use client";

import { useState } from "react";
import Link from "next/link";
import type { FlashCard } from "@/lib/contentDb";
import { ROUTES } from "@/config/terminology";

interface Props {
  deckTitle: string;
  cards: FlashCard[];
}

export default function FlashcardStudyClient({ deckTitle, cards }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const total = cards.length;
  const card = cards[index];

  function handleFlip() {
    setFlipped((f) => !f);
  }

  function handleNext() {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    } else {
      setDone(true);
    }
  }

  function handlePrev() {
    if (index > 0) {
      setIndex((i) => i - 1);
      setFlipped(false);
    }
  }

  function handleRestart() {
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }

  if (total === 0) {
    return (
      <div className="flex-grow flex items-center justify-center py-20 text-center">
        <div>
          <p className="text-gray-400 font-medium mb-1">
            This deck has no cards yet
          </p>
          <Link
            href={ROUTES.flashcards}
            className="text-sm text-[#6D4BCB] hover:underline"
          >
            ← Back to decks
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex-grow flex items-center justify-center py-20">
        <div className="text-center max-w-sm">
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
          <h2 className="text-xl font-bold text-[#2D1B69] mb-2">
            Deck complete!
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            You reviewed all {total} cards in{" "}
            <span className="font-medium">{deckTitle}</span>.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="bg-[#6D4BCB] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#5E3FB8] transition-colors"
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
    <div className="flex-grow flex flex-col items-center py-10 px-4">
      {/* Progress */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">
            Card {index + 1} of {total}
          </span>
          <span className="text-xs text-gray-400">
            {flipped ? "Showing answer" : "Tap to reveal answer"}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6D4BCB] rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <button
        onClick={handleFlip}
        className="w-full max-w-2xl min-h-[260px] bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-md hover:border-[#8050C0]/20 transition-all duration-200 flex flex-col items-center justify-center p-8 cursor-pointer select-none group"
        aria-label={flipped ? "Hide answer" : "Reveal answer"}
      >
        {/* Image (if any, front side only) */}
        {!flipped && card.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={card.imageUrl}
            alt=""
            className="max-h-32 object-contain mb-4 rounded-lg"
          />
        )}

        <div className="text-center">
          <p
            className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${
              flipped ? "text-[#6D4BCB]" : "text-gray-400"
            }`}
          >
            {flipped ? "Answer" : "Question"}
          </p>
          <p
            className={`text-base md:text-lg leading-relaxed ${
              flipped ? "text-[#2D1B69] font-medium" : "text-gray-800"
            }`}
          >
            {flipped ? card.back : card.front}
          </p>
        </div>

        {!flipped && (
          <p className="mt-6 text-xs text-gray-300 group-hover:text-gray-400 transition-colors">
            tap to flip
          </p>
        )}
      </button>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#2D1B69] hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous card"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={handleNext}
          className="bg-[#6D4BCB] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#5E3FB8] transition-colors"
        >
          {index < total - 1 ? "Next Card →" : "Finish"}
        </button>

        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="w-10 h-10 opacity-0 pointer-events-none"
          aria-hidden
        />
      </div>
    </div>
  );
}

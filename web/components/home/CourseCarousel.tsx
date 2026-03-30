"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FeaturedCard } from "@/lib/featuredCardsDb";

// Desktop carousel constants
const VISIBLE = 3;
const SLIDE_INTERVAL = 5000;
const TRANSITION_MS = 600;

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function CourseCard({ card }: { card: FeaturedCard }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col h-full">
      {card.thumbnailUrl ? (
        <div className="relative h-36 overflow-hidden flex-shrink-0">
          <Image
            src={card.thumbnailUrl}
            alt={card.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 85vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 px-3 pb-2 flex flex-col items-start gap-1">
            {card.badge && (
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                {card.badge}
              </span>
            )}
            <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow">
              {card.title}
            </h3>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] h-36 flex-shrink-0 flex flex-col items-center justify-center px-5 gap-2">
          {card.badge && (
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {card.badge}
            </span>
          )}
          <h3 className="text-white font-bold text-sm text-center leading-snug line-clamp-3">
            {card.title}
          </h3>
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {card.categoryName && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
            {card.categoryName}
          </span>
        )}
        {card.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">
            {card.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto gap-3">
          <div className="min-w-0">
            {card.isFree ? (
              <span className="text-base font-bold text-[#2D1B69]">Free</span>
            ) : card.price !== null ? (
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-base font-bold text-[#2D1B69]">
                  {formatPrice(card.price)}
                </span>
                {card.originalPrice !== null && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(card.originalPrice)}
                  </span>
                )}
                {card.discountPercent != null && card.discountPercent > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    {card.discountPercent}% off
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <Link
            href={card.ctaHref}
            className="text-xs font-semibold bg-[#6D4BCB] text-white px-3 py-1.5 rounded-full hover:bg-[#5E3FB8] transition-colors shrink-0"
          >
            {card.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Mobile: CSS scroll-snap carousel ──────────────────────────────────────────
// No JS required — native touch/swipe, one card at a time with a peek of next.
function MobileScrollCarousel({ cards }: { cards: FeaturedCard[] }) {
  return (
    <div>
      <div
        className="flex overflow-x-auto gap-3 pb-3"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className="shrink-0"
            style={{
              scrollSnapAlign: "start",
              width: "82vw",
              maxWidth: "340px",
            }}
          >
            <CourseCard card={card} />
          </div>
        ))}
        {/* Trailing spacer so the last card doesn't sit flush against the edge */}
        <div className="shrink-0 w-4" aria-hidden />
      </div>
      {/* Swipe hint */}
      <p className="text-center text-[10px] text-gray-400 mt-1">
        ← Swipe to see more →
      </p>
    </div>
  );
}

// ── Desktop: JS infinite carousel ─────────────────────────────────────────────
function DesktopCarousel({ cards }: { cards: FeaturedCard[] }) {
  const [index, setIndex] = useState(0);
  const [animated, setAnimated] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const needsCarousel = cards.length > VISIBLE;
  const extended = needsCarousel ? [...cards, ...cards.slice(0, VISIBLE)] : cards;
  const totalSlots = extended.length;
  const trackWidthPct = (totalSlots / VISIBLE) * 100;
  const perStepPct = 100 / totalSlots;

  const advance = useCallback(() => {
    setAnimated(true);
    setIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!needsCarousel) return;
    intervalRef.current = setInterval(advance, SLIDE_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [advance, needsCarousel]);

  useEffect(() => {
    if (!needsCarousel || index < cards.length) return;
    const t = setTimeout(() => {
      setAnimated(false);
      setIndex(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    }, TRANSITION_MS + 30);
    return () => clearTimeout(t);
  }, [index, cards.length, needsCarousel]);

  if (!needsCarousel) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <CourseCard key={card.id} card={card} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden">
        <div
          className="flex items-stretch"
          style={{
            width: `${trackWidthPct}%`,
            transform: `translateX(${-(index * perStepPct)}%)`,
            transition: animated ? `transform ${TRANSITION_MS}ms ease-in-out` : "none",
            willChange: "transform",
          }}
        >
          {extended.map((card, i) => (
            <div
              key={`${card.id}-${i}`}
              style={{ width: `${100 / totalSlots}%`, flexShrink: 0 }}
              className="px-2.5"
            >
              <CourseCard card={card} />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {cards.map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              i === index % cards.length
                ? "w-5 h-1.5 bg-[#6D4BCB]"
                : "w-1.5 h-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Public export ──────────────────────────────────────────────────────────────
export default function CourseCarousel({ cards }: { cards: FeaturedCard[] }) {
  if (cards.length === 0) return null;

  return (
    <>
      {/* Mobile / tablet — CSS scroll-snap */}
      <div className="lg:hidden">
        <MobileScrollCarousel cards={cards} />
      </div>

      {/* Desktop — JS infinite carousel */}
      <div className="hidden lg:block">
        <DesktopCarousel cards={cards} />
      </div>
    </>
  );
}

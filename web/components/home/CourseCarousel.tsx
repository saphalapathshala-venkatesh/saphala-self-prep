"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FeaturedCard } from "@/lib/featuredCardsDb";

const VISIBLE = 4;
const SLIDE_INTERVAL = 5000;
const TRANSITION_MS = 600;

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function CourseCard({ card }: { card: FeaturedCard }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col h-full">
      {card.thumbnailUrl ? (
        <div className="relative h-32 overflow-hidden flex-shrink-0">
          <Image
            src={card.thumbnailUrl}
            alt={card.title}
            fill
            className="object-cover"
            sizes="25vw"
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
        <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] h-32 flex-shrink-0 flex flex-col items-center justify-center px-5 gap-2">
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
              <span className="text-lg font-bold text-[#2D1B69]">Free</span>
            ) : card.price !== null ? (
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-lg font-bold text-[#2D1B69]">
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

export default function CourseCarousel({ cards }: { cards: FeaturedCard[] }) {
  // ALL hooks declared unconditionally at the top (Rules of Hooks)
  const [index, setIndex] = useState(0);
  const [animated, setAnimated] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const needsCarousel = cards.length > VISIBLE;

  // Extended array for seamless infinite loop:
  // append first VISIBLE cards as clones at the end of the track.
  const extended = needsCarousel
    ? [...cards, ...cards.slice(0, VISIBLE)]
    : cards;
  const totalSlots = extended.length;

  // Track width as % of container:  totalSlots × (100/VISIBLE)%
  // translateX is % of the TRACK, so 1 card shift = (100/totalSlots)%
  const trackWidthPct = (totalSlots / VISIBLE) * 100;
  const perStepPct = 100 / totalSlots;

  const advance = useCallback(() => {
    if (!needsCarousel) return;
    setAnimated(true);
    setIndex((prev) => {
      const next = prev + 1;
      // Once we've slid into the cloned zone, snap back to 0 after transition
      if (next >= cards.length) {
        if (resetRef.current) clearTimeout(resetRef.current);
        resetRef.current = setTimeout(() => {
          setAnimated(false);
          setIndex(0);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setAnimated(true))
          );
        }, TRANSITION_MS + 30);
      }
      return next;
    });
  }, [cards.length, needsCarousel]);

  useEffect(() => {
    if (!needsCarousel) return;
    timerRef.current = setInterval(advance, SLIDE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, [advance, needsCarousel]);

  // Static grid for 4 or fewer cards
  if (!needsCarousel) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <CourseCard key={card.id} card={card} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Carousel track */}
      <div className="overflow-hidden">
        <div
          className="flex items-stretch"
          style={{
            width: `${trackWidthPct}%`,
            transform: `translateX(${-(index * perStepPct)}%)`,
            transition: animated
              ? `transform ${TRANSITION_MS}ms ease-in-out`
              : "none",
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

      {/* Dot indicators — one dot per real card */}
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

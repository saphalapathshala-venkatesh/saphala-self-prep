"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Zap,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

// ─── Preparation System Strip ─────────────────────────────────────────────────
// Same across all 5 banners
const PREP_STEPS = [
  {
    icon: BookOpen,
    label: "Learn",
    desc: "Concept clarity through structured lessons",
  },
  {
    icon: Zap,
    label: "Revise",
    desc: "Quick recall with smart flashcards and notes",
  },
  {
    icon: ClipboardCheck,
    label: "Practice",
    desc: "Topic tests, mock exams, and performance drills",
  },
  {
    icon: TrendingUp,
    label: "Improve",
    desc: "Track progress, find weak areas, prepare better",
  },
];

// ─── Slide data ───────────────────────────────────────────────────────────────
// All banners share the SAME dark purple visual system — only image changes.
// Images: production assets can be swapped by updating the `image` field alone.
const slides = [
  {
    id: 1,
    badge: "Our Platform",
    headline: "Saphala Pathshala",
    subheadline: "Your Success is Our Focus",
    subtext:
      "A complete exam preparation platform that helps aspirants learn with clarity, revise with purpose, and practice with confidence.",
    benefits: [
      "Built for serious competitive exam aspirants",
      "Combines learning, revision, and practice in one platform",
      "Reduces confusion with structured preparation paths",
      "Focuses on exam relevance, not unnecessary overload",
      "Designed to make quality preparation more accessible",
    ],
    primaryCta: { label: "Explore Courses", href: "/courses" },
    // Books / library — knowledge and aspiration theme
    image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Books and library representing knowledge",
    imagePosition: "object-center",
  },
  {
    id: 2,
    badge: "Self Prep System",
    headline: "Self Prep Courses",
    subheadline: "Learn, Revise, and Practice in One Flow",
    subtext:
      "A complete self-learning system that combines ebooks, PDFs, tests, and flashcards for disciplined independent preparation.",
    benefits: [
      "Best for students who prefer structured self-study",
      "Learn chapter by chapter without confusion",
      "Revise faster with integrated flashcards and PDFs",
      "Practice regularly without needing separate resources",
      "Ideal for flexible daily study at your own pace",
    ],
    primaryCta: { label: "Start Self Prep", href: "/courses" },
    // Student studying at desk with books
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Student studying with books and notes",
    imagePosition: "object-center",
  },
  {
    id: 3,
    badge: "Video Learning",
    headline: "Video Courses",
    subheadline: "Understand Difficult Topics with Clear Teaching",
    subtext:
      "Topic-wise video learning for students who want guided explanation, concept clarity, and repeatable revision.",
    benefits: [
      "Learn difficult topics with step-by-step explanation",
      "Replay important lessons anytime you need",
      "Useful for building concept clarity before practice",
      "Study at your own speed without missing classes",
      "Better for students who learn well through teaching",
    ],
    primaryCta: { label: "Watch Video Courses", href: "/courses" },
    // Laptop / online video learning — swap `image` for production asset
    // Production fallback path: /hero/video-learning.png
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Student watching a video lecture on laptop",
    imagePosition: "object-center",
    // Contained style: shown as a framed card, not a full-bleed fill
    imageStyle: "contained" as const,
    showMobileImage: true,
  },
  {
    id: 4,
    badge: "Smart Revision",
    headline: "Flash Cards",
    subheadline: "Quick Revision for Better Memory",
    subtext:
      "Smart active-recall revision designed to help you remember facts, formulas, definitions, and key concepts faster.",
    benefits: [
      "Best for fast daily revision and last-minute review",
      "Improves memory through active recall practice",
      "Saves time compared to rereading full chapters",
      "Helps retain facts, formulas, and key points",
      "Makes revision lighter, faster, and more focused",
    ],
    primaryCta: { label: "Try Flash Cards", href: "/learn/flashcards" },
    // Notes / flashcard-style revision on mobile or paper
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Flashcards and revision notes",
    imagePosition: "object-top",
  },
  {
    id: 5,
    badge: "Practice Tests",
    headline: "Practice Tests",
    subheadline: "Improve Speed, Accuracy, and Confidence",
    subtext:
      "Real exam-style practice that helps you measure readiness, find weak areas, and improve performance before the actual exam.",
    benefits: [
      "Tests your real preparation level regularly",
      "Improves speed under time pressure",
      "Helps identify weak areas early",
      "Builds confidence through repeated exam practice",
      "Makes preparation more performance-oriented",
    ],
    primaryCta: { label: "Attempt a Test", href: "/testhub" },
    // Exam / test-taking environment
    image:
      "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Online exam and test simulation interface",
    imagePosition: "object-center",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const next = useCallback(
    () => goTo((current + 1) % slides.length),
    [current, goTo]
  );
  const prev = useCallback(
    () => goTo((current - 1 + slides.length) % slides.length),
    [current, goTo]
  );

  // Auto-advance; pause on hover
  useEffect(() => {
    if (isHovered) return;
    timerRef.current = setInterval(next, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, isHovered]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  return (
    <section
      className="relative overflow-hidden md:min-h-[620px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── All slides — active is in flow on mobile, all absolute on desktop ── */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== current}
          className={
            i === current
              ? // Active: in normal flow on mobile; absolutely stacked on desktop
                "relative md:absolute md:inset-0 flex md:opacity-100 md:z-10 md:transition-opacity md:duration-700 md:ease-in-out"
              : // Inactive: hidden on mobile; absolutely stacked (invisible) on desktop
                "hidden md:flex md:absolute md:inset-0 md:opacity-0 md:z-0 md:transition-opacity md:duration-700 md:ease-in-out"
          }
        >
          {/* ── Consistent dark purple background for ALL slides ── */}
          <div className="absolute inset-0 bg-[#0F172A]" />

          {/* Subtle dot-grid pattern overlay (same across all) */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Soft ambient light in top-left */}
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#8050C0]/20 blur-3xl pointer-events-none" />

          {/* ── Two-column layout ── */}
          <div className="relative z-10 flex w-full md:h-full">

            {/* LEFT COLUMN — full width on mobile, 60% on desktop */}
            <div className="w-full md:w-[60%] flex flex-col justify-center px-5 sm:px-10 lg:px-16 pt-8 pb-20 md:py-12">
              {/* Badge */}
              <span className="inline-flex w-fit items-center gap-1.5 bg-white/10 border border-white/20 text-white/90 text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full mb-5 backdrop-blur-sm">
                {slide.badge}
              </span>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-1">
                {slide.headline}
              </h1>
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-purple-300 mb-4 leading-snug">
                {slide.subheadline}
              </h2>

              {/* Subtext */}
              <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-lg">
                {slide.subtext}
              </p>

              {/* Benefits — single column on mobile, 2-col on sm+ */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                {slide.benefits.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-[13px] text-white/80"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#88C840] mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* ── Preparation System Strip ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
                {PREP_STEPS.map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 bg-white/8 border border-white/12 rounded-xl p-2.5 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      <span className="text-[11px] font-bold text-white">
                        {label}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/55 leading-snug">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTAs — stacked full-width on mobile, inline on sm+ */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={slide.primaryCta.href}
                  className="bg-white text-[#1040A0] font-bold px-7 py-3 rounded-full hover:bg-purple-50 transition-colors shadow-lg text-sm text-center"
                >
                  {slide.primaryCta.label}
                </Link>
                <Link
                  href="/register"
                  className="border border-white/50 text-white font-semibold px-7 py-3 rounded-full hover:bg-white/10 transition-colors text-sm text-center"
                >
                  Create Free Account
                </Link>
              </div>

              {/* Mobile image — visible on ALL slides, appears below buttons */}
              <div className="md:hidden mt-7">
                {"imageStyle" in slide && slide.imageStyle === "contained" ? (
                  // Contained style (e.g. laptop screenshot) — shown as framed card
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.imageAlt}
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>
                ) : (
                  // Full-bleed style — shown as a fixed-height photo strip
                  <div
                    className="rounded-xl overflow-hidden w-full"
                    style={{ height: "200px" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.imageAlt}
                      className={`w-full h-full object-cover ${slide.imagePosition}`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — 40% — Contextual image (desktop only) */}
            {"imageStyle" in slide && slide.imageStyle === "contained" ? (
              // Contained image: framed card — fills the right 40% column
              <div className="hidden md:flex md:w-[40%] items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.imageAlt}
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            ) : (
              // Full-bleed cover image (all other banners)
              <div className="hidden md:block md:w-[40%] relative overflow-hidden">
                {/* Gradient fade from left (blends image into dark bg) */}
                <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#0F172A] to-transparent z-10 pointer-events-none" />
                {/* Gradient vignette on edges */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0F172A] to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0F172A] to-transparent z-10 pointer-events-none" />

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.imageAlt}
                  className={`absolute inset-0 w-full h-full object-cover ${slide.imagePosition} opacity-75`}
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── Mobile background image (very subtle, behind content) ── */}
      <div className="absolute inset-0 md:hidden z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slides[current].image}
          alt=""
          aria-hidden
          className={`w-full h-full object-cover ${slides[current].imagePosition} opacity-[0.10]`}
        />
      </div>

      {/* ── Prev / Next arrows — hidden on mobile, visible on desktop ── */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 items-center justify-center text-white backdrop-blur-sm transition-colors z-20"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 items-center justify-center text-white backdrop-blur-sm transition-colors z-20"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* ── Dot indicators — bottom-4 on desktop; on mobile relative to section bottom ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-white w-7" : "bg-white/35 w-2"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: 1,
    badge: "Our Platform",
    headline: "Saphala Pathshala",
    headlineAccent: "Your Success is Our Focus",
    subtext:
      "A complete exam preparation platform that helps aspirants learn with clarity, revise with purpose, and practice with confidence.",
    benefits: [
      "Built for serious competitive exam aspirants",
      "Combines learning, revision, and practice in one platform",
      "Reduces confusion with structured preparation paths",
      "Focuses on exam relevance, not unnecessary overload",
      "Designed to make quality preparation more accessible",
    ],
    cta: { label: "Explore Courses", href: "/courses" },
    accent: "from-[#2D1B69] via-[#4a2d9e] to-[#6D4BCB]",
  },
  {
    id: 2,
    badge: "Self Prep System",
    headline: "Self Prep Courses",
    headlineAccent: "Learn, Revise, and Practice in One Flow",
    subtext:
      "A complete self-learning system that combines ebooks, PDFs, tests, and flashcards for disciplined independent preparation.",
    benefits: [
      "Best for students who prefer structured self-study",
      "Learn chapter by chapter without confusion",
      "Revise faster with integrated flashcards and PDFs",
      "Practice regularly without needing separate resources",
      "Ideal for flexible daily study at your own pace",
    ],
    cta: { label: "Start Self Prep", href: "/courses?type=self-prep" },
    accent: "from-[#1e3a5f] via-[#2d5a8e] to-[#4a90d9]",
  },
  {
    id: 3,
    badge: "Video Learning",
    headline: "Video Courses",
    headlineAccent: "Understand Difficult Topics with Clear Teaching",
    subtext:
      "Topic-wise video learning for students who want guided explanation, concept clarity, and repeatable revision.",
    benefits: [
      "Learn difficult topics with step-by-step explanation",
      "Replay important lessons anytime you need",
      "Useful for building concept clarity before practice",
      "Study at your own speed without missing classes",
      "Better for students who learn well through teaching",
    ],
    cta: { label: "Watch Video Courses", href: "/courses?type=video" },
    accent: "from-[#1a3a2a] via-[#2d5e42] to-[#3d8b5a]",
  },
  {
    id: 4,
    badge: "Smart Revision",
    headline: "Flash Cards",
    headlineAccent: "Quick Revision for Better Memory",
    subtext:
      "Smart active-recall revision designed to help you remember facts, formulas, definitions, and key concepts faster.",
    benefits: [
      "Best for fast daily revision and last-minute review",
      "Improves memory through active recall practice",
      "Saves time compared to rereading full chapters",
      "Helps retain facts, formulas, and key points",
      "Makes revision lighter, faster, and more focused",
    ],
    cta: { label: "Try Flash Cards", href: "/courses?type=flashcards" },
    accent: "from-[#3a1a4a] via-[#6a2d8e] to-[#9b5ad4]",
  },
  {
    id: 5,
    badge: "Practice Tests",
    headline: "Practice Tests",
    headlineAccent: "Improve Speed, Accuracy, and Confidence",
    subtext:
      "Real exam-style practice that helps you measure readiness, find weak areas, and improve performance before the actual exam.",
    benefits: [
      "Tests your real preparation level regularly",
      "Improves speed under time pressure",
      "Helps identify weak areas early",
      "Builds confidence through repeated exam practice",
      "Makes preparation more performance-oriented",
    ],
    cta: { label: "Attempt a Test", href: "/testhub" },
    accent: "from-[#3a1a1a] via-[#8e2d2d] to-[#c94f4f]",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (animating) return;
      setAnimating(true);
      setCurrent(index);
      setTimeout(() => setAnimating(false), 600);
    },
    [animating]
  );

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(
    () => goTo((current - 1 + slides.length) % slides.length),
    [current, goTo]
  );

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative overflow-hidden min-h-[480px] md:min-h-[520px] flex items-center">
      {/* Background gradient (animates per slide) */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${slide.accent} transition-all duration-700`}
      />
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5" />

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-block bg-white/15 text-white text-[11px] font-semibold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm border border-white/20">
            {slide.badge}
          </span>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
            {slide.headline}
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold text-white/80 mb-5 leading-snug">
            {slide.headlineAccent}
          </h2>

          {/* Subtext */}
          <p className="text-white/75 text-sm md:text-base mb-7 max-w-xl mx-auto leading-relaxed">
            {slide.subtext}
          </p>

          {/* Benefits */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left max-w-2xl mx-auto mb-8">
            {slide.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-white/85">
                <CheckCircle2 className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={slide.cta.href}
              className="bg-white text-[#2D1B69] font-semibold px-8 py-3 rounded-full hover:bg-purple-50 transition-colors shadow-lg text-sm"
            >
              {slide.cta.label}
            </Link>
            <Link
              href="/register"
              className="border border-white/50 text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors text-sm"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm transition-colors z-20"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm transition-colors z-20"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-white w-8" : "bg-white/40 w-2"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

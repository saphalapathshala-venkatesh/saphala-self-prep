"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: "appsc", name: "APPSC" },
  { id: "appolice", name: "AP Police" },
  { id: "banking", name: "Banking" },
  { id: "ssc", name: "SSC" },
  { id: "railway", name: "Railway" },
  { id: "upsc", name: "UPSC" },
  { id: "tspsc", name: "TSPSC" },
  { id: "defence", name: "Defence" },
];

function toSlug(name: string) {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

function CategoryCard({ cat }: { cat: Category }) {
  return (
    <Link
      href={`/exams/${toSlug(cat.name)}`}
      className="group shrink-0 w-48 sm:w-52 flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      <div className="relative w-full aspect-video bg-gradient-to-br from-[#6D4BCB]/10 to-[#2D1B69]/20 overflow-hidden">
        {cat.thumbnailUrl ? (
          <Image
            src={cat.thumbnailUrl}
            alt={cat.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Image
              src="/images/saphala-logo.png"
              alt="Saphala"
              width={36}
              height={36}
              className="opacity-40"
            />
            <span className="text-xs font-bold text-[#6D4BCB]/60 tracking-wide">
              {cat.name}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-[#2D1B69]/0 group-hover:bg-[#2D1B69]/10 transition-colors duration-200" />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-[#2D1B69] group-hover:text-[#6D4BCB] transition-colors truncate">
          {cat.name}
        </span>
        <span className="text-[#6D4BCB] text-xs font-bold ml-2 shrink-0">→</span>
      </div>
    </Link>
  );
}

export default function ExamCategoriesSection() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");

  // Scroll container ref
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track element ref — needed to measure width during drag and click
  const trackRef = useRef<HTMLDivElement>(null);
  // Drag state kept in a ref (not state) to avoid re-renders on every mousemove
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null);
  // Controls thumb CSS transition — disabled during drag so thumb tracks cursor exactly
  const [isDragging, setIsDragging] = useState(false);

  const [thumb, setThumb] = useState({ left: 0, width: 30 });

  // ─── Scroll helpers ────────────────────────────────────────────────────────
  const scrollLeft = () =>
    scrollRef.current?.scrollBy({ left: -280, behavior: "smooth" });
  const scrollRight = () =>
    scrollRef.current?.scrollBy({ left: 280, behavior: "smooth" });

  // ─── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/public/categories")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data as Category[]);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES))
      .finally(() => setLoading(false));
  }, []);

  // ─── Scroll → thumb sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const el = scrollRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const scrollable = el.scrollWidth - el.clientWidth;
      if (scrollable <= 0) {
        setThumb({ left: 0, width: 100 });
        return;
      }
      const w = Math.max((el.clientWidth / el.scrollWidth) * 100, 12);
      const l = (el.scrollLeft / scrollable) * (100 - w);
      setThumb({ left: l, width: w });
    }

    const raf = requestAnimationFrame(update);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [loading]);

  // ─── Dropdown ──────────────────────────────────────────────────────────────
  function handleDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    if (!slug) return;
    router.push(`/exams/${slug}`);
    setSelected("");
  }

  // ─── Track click (desktop) ─────────────────────────────────────────────────
  // Maps click position linearly to scroll position.
  // The thumb's onClick calls stopPropagation so this doesn't fire during drag end.
  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    // Ignore if the user just finished a drag (mouseup fired before this click)
    if (dragRef.current) return;
    const track = trackRef.current;
    const scroll = scrollRef.current;
    if (!track || !scroll) return;
    const scrollable = scroll.scrollWidth - scroll.clientWidth;
    if (scrollable <= 0) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    scroll.scrollLeft = fraction * scrollable;
  }

  // ─── Thumb drag (desktop) ──────────────────────────────────────────────────
  function handleThumbMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault(); // Prevent text selection during drag
    e.stopPropagation(); // Prevent track click from also firing

    const startX = e.clientX;
    const startScroll = scrollRef.current?.scrollLeft ?? 0;
    dragRef.current = { startX, startScroll };
    setIsDragging(true);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    function onMouseMove(ev: MouseEvent) {
      const drag = dragRef.current;
      const scroll = scrollRef.current;
      const track = trackRef.current;
      if (!drag || !scroll || !track) return;

      const scrollable = scroll.scrollWidth - scroll.clientWidth;
      if (scrollable <= 0) return;

      // Thumb width as fraction of track (computed fresh, not from stale closure)
      const thumbWidthFrac = Math.max(scroll.clientWidth / scroll.scrollWidth, 0.12);
      // Range of pixels the thumb's left edge can travel across the track
      const trackRange = track.clientWidth * (1 - thumbWidthFrac);

      const delta = ev.clientX - drag.startX;
      const scrollDelta = trackRange > 0 ? (delta / trackRange) * scrollable : 0;
      scroll.scrollLeft = Math.max(0, Math.min(scrollable, drag.startScroll + scrollDelta));
    }

    function onMouseUp() {
      dragRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#8050C0] mb-3">
            Choose Your Exam
          </h2>
          <p className="text-[#6B5CA5] max-w-xl mx-auto">
            Browse preparation options based on your target exam and start with
            the learning path that fits you best.
          </p>
        </div>

        {/* Quick-select dropdown — full-width on mobile, constrained from sm up */}
        {!loading && categories.length > 0 && (
          <div className="relative w-full sm:max-w-xs sm:mx-auto mb-8">
            <select
              value={selected}
              onChange={handleDropdownChange}
              className="w-full appearance-none bg-white border border-[#8050C0]/30 text-[#2D1B69] rounded-xl px-4 py-3.5 pr-10 text-sm font-medium shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8050C0]/40 focus:border-[#8050C0]/60 transition-colors"
            >
              <option value="" disabled>
                Choose Your Target Exam
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={toSlug(cat.name)}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8050C0]">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Card slider */}
        {loading ? (
          <div className="flex gap-4 overflow-x-hidden pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-48 rounded-2xl bg-gray-100 animate-pulse aspect-[4/3]"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Left arrow — desktop only */}
            <button
              onClick={scrollLeft}
              aria-label="Scroll left"
              className="hidden md:flex shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center text-[#8050C0] hover:bg-[#F6F2FF] hover:border-[#8050C0]/30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* Scroll container with right-edge fade hint on mobile */}
            <div className="relative flex-1 min-w-0">
              <div
                id="exam-category-scroll"
                ref={scrollRef}
                className="exam-scroll flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
              >
                {categories.map((cat) => (
                  <div key={cat.id} className="snap-start">
                    <CategoryCard cat={cat} />
                  </div>
                ))}
              </div>
              {/* Subtle right-edge fade — mobile only, signals more cards to the right */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-white to-transparent md:hidden" />
            </div>

            {/* Right arrow — desktop only */}
            <button
              onClick={scrollRight}
              aria-label="Scroll right"
              className="hidden md:flex shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center text-[#8050C0] hover:bg-[#F6F2FF] hover:border-[#8050C0]/30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/*
          Progress bar / interactive scroll control
          ─ Mobile:  passive indicator only (touch scroll is primary)
          ─ Desktop: click on track to jump, drag thumb to scrub
        */}
        {!loading && (
          <div
            ref={trackRef}
            role="scrollbar"
            aria-controls="exam-category-scroll"
            aria-valuenow={Math.round(thumb.left)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scroll exam categories"
            onClick={handleTrackClick}
            className="relative h-2.5 rounded-full mt-4 bg-[#E9E0FF] overflow-hidden md:cursor-pointer"
          >
            <div
              onMouseDown={handleThumbMouseDown}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 h-full rounded-full bg-[#8050C0] md:cursor-grab md:hover:bg-[#6D3DB0] transition-colors duration-150"
              style={{
                width: `${thumb.width}%`,
                left: `${thumb.left}%`,
                // Disable transition while dragging so thumb tracks cursor exactly
                transition: isDragging
                  ? "none"
                  : "left 80ms ease, width 80ms ease",
              }}
            />
          </div>
        )}

        {/* Helper hint — mobile only, desktop has arrows + interactive bar */}
        <p className="md:hidden text-xs text-[#8050C0]/60 font-medium text-center mt-3">
          Swipe to explore all exam categories
        </p>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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

function CategoryCard({ cat }: { cat: Category }) {
  return (
    <Link
      href={`/exams/${encodeURIComponent(cat.name.toLowerCase().replace(/\s+/g, "-"))}`}
      className="group shrink-0 w-48 sm:w-52 flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      {/* 16:9 Thumbnail */}
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
        {/* Overlay shimmer on hover */}
        <div className="absolute inset-0 bg-[#2D1B69]/0 group-hover:bg-[#2D1B69]/10 transition-colors duration-200" />
      </div>

      {/* Title row */}
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom scroll indicator state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 30 });

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

  // Attach scroll listener once categories are loaded and DOM is ready
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
      // Thumb width = visible fraction of total content
      const w = Math.max((el.clientWidth / el.scrollWidth) * 100, 12);
      // Thumb left = scroll progress mapped to remaining track space
      const l = (el.scrollLeft / scrollable) * (100 - w);
      setThumb({ left: l, width: w });
    }

    // Small delay to ensure layout is painted before measuring
    const raf = requestAnimationFrame(update);

    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [loading]);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">
            Choose Your Exam
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Browse preparation options based on your target exam and start with
            the learning path that fits you best.
          </p>
        </div>

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
          <div
            ref={scrollRef}
            className="exam-scroll flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
          >
            {categories.map((cat) => (
              <div key={cat.id} className="snap-start">
                <CategoryCard cat={cat} />
              </div>
            ))}
          </div>
        )}

        {/* Custom always-visible scroll indicator (track + thumb) */}
        {!loading && (
          <div className="relative h-2 rounded-full mt-3 overflow-hidden" style={{ background: "#E9E0FF" }}>
            <div
              className="absolute top-0 h-full rounded-full"
              style={{
                background: "#8050C0",
                width: `${thumb.width}%`,
                left: `${thumb.left}%`,
                transition: "left 80ms ease, width 80ms ease",
              }}
            />
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-3">
          Scroll to see more exam categories →
        </p>
      </div>
    </section>
  );
}

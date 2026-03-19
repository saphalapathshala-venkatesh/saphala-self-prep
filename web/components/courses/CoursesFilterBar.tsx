"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const PRODUCT_OPTIONS = [
  { value: "",                  label: "All Types" },
  { value: "FREE_DEMO",         label: "Free Demo Courses & Tests" },
  { value: "TEST_SERIES",       label: "Test Series" },
  { value: "FLASHCARDS_ONLY",   label: "Flashcard Decks" },
  { value: "VIDEO_ONLY",        label: "Video Courses" },
  { value: "COMPLETE_PREP_PACK",label: "Complete Prep Pack" },
  { value: "SELF_PREP",         label: "Self Prep" },
  { value: "PDF_ONLY",          label: "PDF Study Material" },
  { value: "CURRENT_AFFAIRS",   label: "Current Affairs" },
];

interface Props {
  categories: { id: string; name: string }[];
}

export function CoursesFilterBar({ categories }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const activeCategory = sp.get("category") ?? "";
  const activeProduct  = sp.get("productCategory") ?? "";

  const navigate = useCallback(
    (category: string, productCategory: string) => {
      const params = new URLSearchParams();
      if (category)        params.set("category", category);
      if (productCategory) params.set("productCategory", productCategory);
      const qs = params.toString();
      router.push(qs ? `/dashboard/courses?${qs}` : "/dashboard/courses");
    },
    [router]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Category dropdown */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          Exam Category
        </label>
        <div className="relative">
          <select
            value={activeCategory}
            onChange={(e) => navigate(e.target.value, activeProduct)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-[#2D1B69] focus:outline-none focus:ring-2 focus:ring-[#6D4BCB] focus:border-[#6D4BCB] cursor-pointer transition-colors hover:border-[#6D4BCB]/50"
          >
            <option value="">All Exam Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Product category dropdown */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          Course Type
        </label>
        <div className="relative">
          <select
            value={activeProduct}
            onChange={(e) => navigate(activeCategory, e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-[#2D1B69] focus:outline-none focus:ring-2 focus:ring-[#6D4BCB] focus:border-[#6D4BCB] cursor-pointer transition-colors hover:border-[#6D4BCB]/50"
          >
            {PRODUCT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Clear button — only shown when filters are active */}
      {(activeCategory || activeProduct) && (
        <div className="flex items-end">
          <button
            onClick={() => navigate("", "")}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-[#6D4BCB] hover:text-[#6D4BCB] transition-colors bg-white font-medium whitespace-nowrap"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

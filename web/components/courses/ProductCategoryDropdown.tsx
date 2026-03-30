"use client";

import { useRouter } from "next/navigation";

const PRODUCT_OPTIONS = [
  { value: "",                   label: "All Course Types" },
  { value: "FREE_DEMO",          label: "Free Demo Courses & Tests" },
  { value: "TEST_SERIES",        label: "Test Series" },
  { value: "COMPLETE_PREP_PACK", label: "Complete Prep Packs" },
  { value: "VIDEO_ONLY",         label: "Video Courses" },
  { value: "SELF_PREP",          label: "Self Prep Courses" },
  { value: "PDF_ONLY",           label: "PDF Study Material" },
  { value: "FLASHCARDS_ONLY",    label: "Flashcard Decks" },
  { value: "CURRENT_AFFAIRS",    label: "Current Affairs" },
];

interface Props {
  activeProductCategory: string | null;
  activeCategory: string | null;
  activeExam: string | null;
}

export default function ProductCategoryDropdown({
  activeProductCategory,
  activeCategory,
  activeExam,
}: Props) {
  const router = useRouter();

  function onChange(productCategory: string) {
    const p = new URLSearchParams();
    if (productCategory) p.set("productCategory", productCategory);
    if (activeCategory)  p.set("category", activeCategory);
    if (activeExam)      p.set("exam", activeExam);
    const qs = p.toString();
    router.push(qs ? `/courses?${qs}` : "/courses");
  }

  return (
    <div className="relative">
      <select
        value={activeProductCategory ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-[#2D1B69] focus:outline-none focus:ring-2 focus:ring-[#6D4BCB] focus:border-[#6D4BCB] cursor-pointer transition-colors hover:border-[#6D4BCB]/50 shadow-sm"
      >
        {PRODUCT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

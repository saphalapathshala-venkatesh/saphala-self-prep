"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  APPSC: "from-purple-500 to-indigo-600",
  "AP Police": "from-blue-500 to-cyan-600",
  Banking: "from-green-500 to-emerald-600",
  SSC: "from-orange-500 to-amber-600",
  Railway: "from-red-500 to-rose-600",
  UPSC: "from-violet-500 to-purple-600",
  TSPSC: "from-teal-500 to-cyan-600",
  Defence: "from-slate-500 to-gray-600",
};

function getColor(name: string): string {
  return (
    CATEGORY_COLORS[name] ||
    "from-[#6D4BCB] to-[#2D1B69]"
  );
}

function getInitial(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: "appsc", name: "APPSC" },
  { id: "appolice", name: "AP Police" },
  { id: "banking", name: "Banking" },
  { id: "ssc", name: "SSC" },
  { id: "railway", name: "Railway" },
  { id: "upsc", name: "UPSC" },
];

export default function ExamCategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">
            Exam Categories
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Browse courses and tests by your target exam. Focused preparation built around what matters most.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?category=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-5"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getColor(cat.name)} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                >
                  {getInitial(cat.name)}
                </div>
                <span className="text-sm font-semibold text-[#2D1B69] text-center group-hover:text-[#6D4BCB] transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

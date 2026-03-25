import type { ReactNode } from "react";
import Link from "next/link";
import { ROUTES } from "@/config/terminology";

interface LearnPageShellProps {
  productLabel: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  backHref?: string;
}

export default function LearnPageShell({
  productLabel,
  title,
  description,
  children,
  backHref,
}: LearnPageShellProps) {
  const resolvedBackHref = backHref ?? ROUTES.dashboard;
  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-3">
            <Link
              href={resolvedBackHref}
              className="text-gray-400 hover:text-[#6D4BCB] transition-colors"
              aria-label="Back to dashboard"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#6D4BCB]">
              {productLabel}
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2D1B69] mb-1.5">{title}</h1>
          <p className="text-gray-500 text-sm max-w-xl leading-relaxed">{description}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {children}
      </div>
    </div>
  );
}

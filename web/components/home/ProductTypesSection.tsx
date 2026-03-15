import Link from "next/link";
import {
  Gift,
  Package,
  PlayCircle,
  BookOpen,
  FileText,
  ClipboardCheck,
  Layers,
  Newspaper,
} from "lucide-react";
import { ROUTES } from "@/config/terminology";

const PRODUCT_TYPES = [
  {
    icon: Gift,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    title: "Free Demo Courses & Tests",
    desc: "Try selected free courses and tests before choosing your full preparation path.",
    cta: "Start for Free",
    href: ROUTES.testHub,
  },
  {
    icon: Package,
    iconBg: "bg-[#F6F2FF]",
    iconColor: "text-[#6D4BCB]",
    title: "Complete Prep Packs",
    desc: "Get video, PDFs, tests, and flashcards bundled in one focused preparation package.",
    cta: "View Packs",
    href: ROUTES.courses,
  },
  {
    icon: PlayCircle,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Video Courses",
    desc: "Learn through structured, topic-wise recorded video lessons taught by subject experts.",
    cta: "Watch Lessons",
    href: ROUTES.courses,
  },
  {
    icon: BookOpen,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    title: "Self Prep Courses",
    desc: "Study independently using a structured mix of ebooks, PDFs, tests, and flashcards.",
    cta: "Start Self Prep",
    href: ROUTES.courses,
  },
  {
    icon: FileText,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    title: "PDF Study Material",
    desc: "Access focused, exam-oriented study material for reading, revision, and offline use.",
    cta: "Browse PDFs",
    href: ROUTES.pdfs,
  },
  {
    icon: ClipboardCheck,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    title: "Test Series",
    desc: "Practice topic tests, subject tests, and full-length mock exams in real exam format.",
    cta: "Take a Test",
    href: ROUTES.testHub,
  },
  {
    icon: Layers,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    title: "Flash Cards",
    desc: "Revise key concepts quickly with memory-friendly cards built for daily recall practice.",
    cta: "Revise Now",
    href: ROUTES.flashcards,
  },
  {
    icon: Newspaper,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "Current Affairs",
    desc: "Stay exam-ready with targeted content, daily digests, and quiz-based current affairs revision.",
    cta: "Stay Updated",
    href: ROUTES.testHub,
  },
];

export default function ProductTypesSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#8050C0] mb-3">
            Prepare Your Way
          </h2>
          <p className="text-[#6B5CA5] max-w-2xl mx-auto">
            Find the right learning approach for you. Every student prepares differently — Saphala supports all styles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRODUCT_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 hover:border-[#8050C0]/20 transition-all duration-200"
              >
                {/* Header strip */}
                <div className="bg-[#8050C0] group-hover:bg-[#6D3DB0] px-4 py-3 flex items-center gap-3 transition-colors duration-200">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ${item.iconBg} ${item.iconColor}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-sm leading-snug flex-1">
                    {item.title}
                  </h3>
                </div>

                {/* Description */}
                <div className="flex-1 px-4 pt-4 pb-3">
                  <p className="text-[#6B5CA5] text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* CTA */}
                <div className="px-4 pb-4">
                  <span className="block w-full text-center bg-white border-2 border-[#8050C0] text-[#8050C0] group-hover:bg-[#F6F2FF] group-hover:text-[#6D3DB0] text-sm font-semibold py-2.5 rounded-xl transition-colors duration-150">
                    {item.cta}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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

const PRODUCT_TYPES = [
  {
    icon: Gift,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    title: "Free Demo Courses & Tests",
    desc: "Explore selected free content to understand the platform before committing to a full preparation plan.",
    cta: "Start for free",
    href: "/courses?type=free",
  },
  {
    icon: Package,
    iconBg: "bg-[#F6F2FF]",
    iconColor: "text-[#6D4BCB]",
    title: "Complete Prep Packs",
    desc: "Get video, PDFs, tests, and flashcards bundled in one focused preparation package.",
    cta: "View packs",
    href: "/courses?type=complete-pack",
  },
  {
    icon: PlayCircle,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Video Courses",
    desc: "Learn through structured, topic-wise recorded video lessons taught by subject experts.",
    cta: "Watch lessons",
    href: "/courses?type=video",
  },
  {
    icon: BookOpen,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    title: "Self Prep Courses",
    desc: "Study independently using a structured mix of ebooks, PDFs, tests, and flashcards.",
    cta: "Start self prep",
    href: "/courses?type=self-prep",
  },
  {
    icon: FileText,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    title: "PDF Study Material",
    desc: "Access focused, exam-oriented study material for reading, revision, and offline use.",
    cta: "Browse PDFs",
    href: "/courses?type=pdf",
  },
  {
    icon: ClipboardCheck,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    title: "Test Series",
    desc: "Practice topic tests, subject tests, and full-length mock exams in real exam format.",
    cta: "Take a test",
    href: "/testhub",
  },
  {
    icon: Layers,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    title: "Flash Cards",
    desc: "Revise key concepts quickly with memory-friendly cards built for daily recall practice.",
    cta: "Revise now",
    href: "/courses?type=flashcards",
  },
  {
    icon: Newspaper,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "Current Affairs",
    desc: "Prepare current affairs with targeted content, daily digests, and quiz-based revision.",
    cta: "Stay updated",
    href: "/courses?type=current-affairs",
  },
];

export default function ProductTypesSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#8050C0] mb-3">
            Prepare Your Way
          </h2>
          <p className="text-[#6B5CA5] max-w-2xl mx-auto">
            Find the right learning approach for you. Every student prepares
            differently — Saphala supports all styles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRODUCT_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-xl hover:-translate-y-1 hover:border-[#8050C0]/20 transition-all duration-200"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconBg} ${item.iconColor} group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h3 className="font-bold text-[#2D1B69] text-base mb-2 group-hover:text-[#6D4BCB] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[#6B5CA5] text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* CTA */}
                <span className="text-sm font-semibold text-[#6D4BCB] flex items-center gap-1 mt-auto">
                  {item.cta}
                  <span className="inline-block group-hover:translate-x-1 transition-transform duration-150">
                    →
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
    color: "bg-green-100 text-green-700",
    title: "Free (Demo) Courses and Tests",
    desc: "Explore selected free content before you commit to a full preparation plan.",
    href: "/courses?type=free",
  },
  {
    icon: Package,
    color: "bg-purple-100 text-purple-700",
    title: "Complete Prep Packs",
    desc: "Get a combined preparation package with multiple learning tools in one place.",
    href: "/courses?type=complete-pack",
  },
  {
    icon: PlayCircle,
    color: "bg-blue-100 text-blue-700",
    title: "Video Only Courses",
    desc: "Learn through guided concept explanation with topic-wise recorded video lessons.",
    href: "/courses?type=video",
  },
  {
    icon: BookOpen,
    color: "bg-indigo-100 text-indigo-700",
    title: "Self Prep Courses",
    desc: "Study independently with a structured mix of ebooks, PDFs, tests, and flashcards.",
    href: "/courses?type=self-prep",
  },
  {
    icon: FileText,
    color: "bg-teal-100 text-teal-700",
    title: "PDF Courses",
    desc: "Access focused exam-oriented study material for reading, revision, and offline use.",
    href: "/courses?type=pdf",
  },
  {
    icon: ClipboardCheck,
    color: "bg-orange-100 text-orange-700",
    title: "Test Series",
    desc: "Practice topic tests, subject tests, and full-length exams in real test format.",
    href: "/testhub",
  },
  {
    icon: Layers,
    color: "bg-pink-100 text-pink-700",
    title: "Flash Cards",
    desc: "Revise key concepts quickly with memory-friendly cards for daily recall practice.",
    href: "/courses?type=flashcards",
  },
  {
    icon: Newspaper,
    color: "bg-yellow-100 text-yellow-700",
    title: "Current Affairs",
    desc: "Prepare current affairs with targeted content, revision tools, and test practice.",
    href: "/courses?type=current-affairs",
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
            Find the right learning approach for you. Every student prepares
            differently — Saphala supports all styles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCT_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#2D1B69] text-sm mb-1 group-hover:text-[#6D4BCB] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
                <span className="text-xs font-semibold text-[#6D4BCB] mt-auto">
                  Browse →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

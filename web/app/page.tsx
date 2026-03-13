import Link from "next/link";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import QuoteKalamStrip from "@/components/home/QuoteKalamStrip";
import ExamCategoriesSection from "@/components/home/ExamCategoriesSection";
import ContactForm from "@/components/home/ContactForm";
import {
  BookOpen,
  PlayCircle,
  FileText,
  ClipboardCheck,
  Layers,
  Target,
  TrendingUp,
  Zap,
  Brain,
  BookMarked,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      {/* Quote + Kalam Dedication Strip */}
      <QuoteKalamStrip />

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#2D1B69] via-[#4a2d9e] to-[#6D4BCB] py-20 md:py-28 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <span className="inline-block bg-white/15 text-white text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            Smart Preparation Platform
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Smart Preparation for{" "}
            <span className="text-purple-300">Competitive Exams</span>
          </h1>
          <p className="text-lg md:text-xl text-purple-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Structured learning paths, real-exam test simulations, smart
            flashcards, and performance analytics — everything you need to crack
            your target exam.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-[#2D1B69] font-semibold px-8 py-3.5 rounded-full hover:bg-purple-50 transition-colors shadow-lg text-sm md:text-base"
            >
              Start Learning Free
            </Link>
            <Link
              href="/testhub"
              className="border border-white/50 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/10 transition-colors text-sm md:text-base"
            >
              Explore TestHub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product Discovery Cards ──────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Saphala Pathshala bundles five powerful learning tools into one
              seamless platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Video Courses */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-[#6D4BCB]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#2D1B69] mb-1">Video Courses</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Structured video lessons with expert explanations for deep
                  concept mastery.
                </p>
              </div>
              <Link
                href="/courses?type=video"
                className="text-sm font-semibold text-[#6D4BCB] hover:underline"
              >
                Explore →
              </Link>
            </div>

            {/* HTML Courses */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#2D1B69] mb-1">HTML Courses</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Interactive text-based lessons you can read and revisit
                  anytime, on any device.
                </p>
              </div>
              <Link
                href="/courses?type=html"
                className="text-sm font-semibold text-[#6D4BCB] hover:underline"
              >
                Explore →
              </Link>
            </div>

            {/* PDF Courses */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#2D1B69] mb-1">PDF Materials</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Downloadable study PDFs, notes, and reference guides for
                  offline revision.
                </p>
              </div>
              <Link
                href="/courses?type=pdf"
                className="text-sm font-semibold text-[#6D4BCB] hover:underline"
              >
                Explore →
              </Link>
            </div>

            {/* Test Series */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#2D1B69] mb-1">Test Series</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Full-length mock exams with timer, auto-grading, rank, and
                  detailed analysis.
                </p>
              </div>
              <Link
                href="/testhub"
                className="text-sm font-semibold text-[#6D4BCB] hover:underline"
              >
                Attempt Now →
              </Link>
            </div>

            {/* Flashcards */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#2D1B69] mb-1">Flashcards</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Smart flashcard decks for rapid revision of key facts and
                  definitions.
                </p>
              </div>
              <Link
                href="/courses?type=flashcards"
                className="text-sm font-semibold text-[#6D4BCB] hover:underline"
              >
                Revise Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Exam Categories (dynamic) ────────────────────────────── */}
      <ExamCategoriesSection />

      {/* ── Features / Benefits ──────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-[#2D1B69] to-[#4a2d9e]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Why Students Choose Saphala
            </h2>
            <p className="text-purple-200 max-w-xl mx-auto">
              Built for serious aspirants who want a proven edge in competitive
              exams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <BookMarked className="w-6 h-6 text-purple-300" />,
                title: "Structured Learning Paths",
                desc: "Curated syllabus-aligned content from basics to advanced, so you never feel lost.",
              },
              {
                icon: <ClipboardCheck className="w-6 h-6 text-purple-300" />,
                title: "Practice Tests with Analysis",
                desc: "Real-exam conditions with timer, negative marking, subject-wise breakdowns, and rank.",
              },
              {
                icon: <Zap className="w-6 h-6 text-purple-300" />,
                title: "Smart Flashcards for Revision",
                desc: "Quick-fire flashcard decks to reinforce memory on the go — perfect for daily revision.",
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-purple-300" />,
                title: "Performance Tracking",
                desc: "Track your accuracy, speed, XP points, and improvement trends over time.",
              },
              {
                icon: <Target className="w-6 h-6 text-purple-300" />,
                title: "Focused Preparation Strategy",
                desc: "Stop scattered studying. Follow exam-specific strategies designed by subject experts.",
              },
              {
                icon: <Brain className="w-6 h-6 text-purple-300" />,
                title: "Bilingual Content",
                desc: "Study in English or Telugu — questions and materials available in both languages.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex gap-4 hover:bg-white/15 transition-colors"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-purple-200 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Form ─────────────────────────────────────────── */}
      <ContactForm />

      {/* ── Footer ───────────────────────────────────────────────── */}
      <Footer />
    </main>
  );
}

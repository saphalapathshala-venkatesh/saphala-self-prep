import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import QuoteKalamStrip from "@/components/home/QuoteKalamStrip";
import HeroSlider from "@/components/home/HeroSlider";
import ExamCategoriesSection from "@/components/home/ExamCategoriesSection";
import ProductTypesSection from "@/components/home/ProductTypesSection";
import FeaturedCoursesSection from "@/components/home/FeaturedCoursesSection";
import ContactForm from "@/components/home/ContactForm";
import {
  BookMarked,
  ClipboardCheck,
  Zap,
  TrendingUp,
  Target,
  Brain,
} from "lucide-react";

// Future Feature: AI Student Guidance Chatbot
// This will later integrate with an AI assistant to guide students on how to
// use the platform, explain product types, help with navigation, and provide
// quick support.

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* 1. Navbar */}
      <Header />

      {/* 2. Quote + Kalam Dedication Strip */}
      <QuoteKalamStrip />

      {/* 3. Hero Slider (5 banners) */}
      <HeroSlider />

      {/* 4. Exam Categories — dynamic, admin-driven */}
      <ExamCategoriesSection />

      {/* 5. Product Types / Learning Approaches */}
      <ProductTypesSection />

      {/* 6. Featured Courses */}
      <FeaturedCoursesSection />

      {/* 7. Features / Benefits */}
      <section className="py-16 bg-gradient-to-br from-[#2D1B69] to-[#4a2d9e]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Why Students Choose Saphala
            </h2>
            <p className="text-purple-200 max-w-xl mx-auto">
              Built for serious aspirants who want a proven edge in competitive exams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <BookMarked className="w-5 h-5 text-purple-300" />,
                title: "Structured Learning Paths",
                desc: "Curated syllabus-aligned content from basics to advanced — no confusion, just clarity.",
              },
              {
                icon: <ClipboardCheck className="w-5 h-5 text-purple-300" />,
                title: "Practice Tests with Analysis",
                desc: "Real-exam conditions with timer, negative marking, subject-wise breakdowns, and rank.",
              },
              {
                icon: <Zap className="w-5 h-5 text-purple-300" />,
                title: "Smart Flashcards for Revision",
                desc: "Quick-fire flashcard decks to reinforce memory on the go — perfect for daily revision.",
              },
              {
                icon: <TrendingUp className="w-5 h-5 text-purple-300" />,
                title: "Performance Tracking",
                desc: "Track your accuracy, speed, XP points, and improvement trends over time.",
              },
              {
                icon: <Target className="w-5 h-5 text-purple-300" />,
                title: "Focused Preparation Strategy",
                desc: "Exam-specific strategies designed to reduce wasted effort and focus on what matters.",
              },
              {
                icon: <Brain className="w-5 h-5 text-purple-300" />,
                title: "Bilingual Content",
                desc: "Study in English or Telugu — questions and materials available in both languages.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex gap-4 hover:bg-white/15 transition-colors"
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1 text-sm">{f.title}</h3>
                  <p className="text-xs text-purple-200 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Contact Form */}
      <ContactForm />

      {/* 9. Footer */}
      <Footer />
    </main>
  );
}

import {
  BookMarked,
  ClipboardCheck,
  Zap,
  TrendingUp,
  Target,
  Brain,
} from "lucide-react";

const FEATURES = [
  {
    icon: BookMarked,
    title: "Structured Learning Paths",
    desc: "Curated syllabus-aligned content from basics to advanced — no confusion, just clarity.",
  },
  {
    icon: ClipboardCheck,
    title: "Practice Tests with Analysis",
    desc: "Real-exam conditions with timer, negative marking, subject-wise breakdowns, and rank.",
  },
  {
    icon: Zap,
    title: "Smart Flashcards for Revision",
    desc: "Quick-fire flashcard decks to reinforce memory on the go — perfect for daily revision.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    desc: "Track your accuracy, speed, XP points, and improvement trends over time.",
  },
  {
    icon: Target,
    title: "Focused Preparation Strategy",
    desc: "Exam-specific strategies designed to reduce wasted effort and focus on what matters.",
  },
  {
    icon: Brain,
    title: "Bilingual Content",
    desc: "Study in English or Telugu — questions and materials available in both languages.",
  },
];

export default function FeaturesSection() {
  return (
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
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex gap-4 hover:bg-white/15 transition-colors"
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1 text-sm">{f.title}</h3>
                  <p className="text-xs text-purple-200 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

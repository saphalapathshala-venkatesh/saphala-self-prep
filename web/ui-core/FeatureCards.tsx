'use client';

import { BookOpen, ClipboardCheck, PlayCircle, Library, type LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  icon: LucideIcon;
  description: string;
  bullets: string[];
  ctaText: string;
}

const FeatureCard = ({ title, icon: Icon, description, bullets, ctaText }: FeatureCardProps) => {
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-white px-6 py-4 flex justify-between items-center">
        <h4 className="text-lg font-bold text-[#2D1B69]">{title}</h4>
        <Icon className="w-6 h-6 text-purple-500 flex-shrink-0" />
      </div>
      <div className="bg-[#F6F2FF] px-6 py-5">
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
        <ul className="space-y-2 mb-6">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-purple-500 font-bold mt-0.5">✓</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <button className="btn-glossy-primary text-sm">
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FeatureCards = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">Saphala Self Prep</h2>
          <p className="text-gray-500 text-base">Choose your learning mode — learn, practice, and improve.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-[#2D1B69]">Saphala Self Prep</h3>
              <p className="text-gray-400 text-sm mt-1">Daily learning + testing designed for exam success.</p>
            </div>
            <div className="flex flex-col gap-6">
              <FeatureCard
                title="Smart Learning"
                icon={BookOpen}
                description="Guided concept learning with interactive lessons and smart flashcards. Learn first, then strengthen memory through smart reinforcement."
                bullets={[
                  "Step-by-step concept lessons (easy to follow)",
                  "Flashcards for active recall and quick revision",
                  "Smart reinforcement after each concept (quick drills)",
                  "Topic-wise learning tracks (syllabus aligned)",
                  "Progress tracking per topic (completed / pending)",
                ]}
                ctaText="Start Learning"
              />
              <FeatureCard
                title="TestHub"
                icon={ClipboardCheck}
                description="Simulated tests that feel like the real exam—timed, structured, and syllabus-based. Build speed, accuracy, and confidence with every attempt."
                bullets={[
                  "Topic tests, subject tests, and grand tests",
                  "Timed exam-mode experience (real pressure practice)",
                  "Instant score + accuracy + time analysis",
                  "Weak-topic insights to improve faster",
                  "Detailed attempt history and improvement tracking",
                ]}
                ctaText="Take a Test"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-[#2D1B69]">Saphala Learn</h3>
              <p className="text-gray-400 text-sm mt-1">Premium learning through videos and curated resources.</p>
            </div>
            <div className="flex flex-col gap-6">
              <FeatureCard
                title="Pathshala"
                icon={PlayCircle}
                description="Premium video learning with structured lessons and clear explanations. Watch recorded classes and attend LIVE classes when available."
                bullets={[
                  "Premium recorded video lessons (topic-wise)",
                  "LIVE classes + schedule visibility (when enabled)",
                  "Exam-focused explanations (fast clarity)",
                  "Lesson-linked notes/resources (where available)",
                  "Continue learning from where you stopped",
                ]}
                ctaText="Watch Premium Videos"
              />
              <FeatureCard
                title="Prep Library"
                icon={Library}
                description="Your organized collection of premium study resources in one place. Access PDFs, notes, model papers, and downloadable materials."
                bullets={[
                  "Premium PDFs and exam-oriented notes",
                  "Model papers & practice material packs",
                  "Read-only + downloadable access (as per plan)",
                  "Course-wise and topic-wise organization",
                  "Quick search to find materials fast",
                ]}
                ctaText="Open Library"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

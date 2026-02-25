"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { mockTests } from "@/config/testhub";
import { useAuthStatus } from "@/lib/auth/useAuthStatus";
import LoginRequiredModal from "@/components/testhub/LoginRequiredModal";

const categories = Array.from(new Set(mockTests.map((t) => t.category)));

export default function TestHubPage() {
  const router = useRouter();
  const { isAuthed } = useAuthStatus();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [modalTestId, setModalTestId] = useState<string | null>(null);

  const filteredTests =
    selectedCategory === "All"
      ? mockTests
      : mockTests.filter((t) => t.category === selectedCategory);

  function handleAttempt(testId: string) {
    if (isAuthed === false) {
      setModalTestId(testId);
    } else {
      router.push(`/testhub/tests/${testId}/brief`);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <section className="bg-white py-12 border-b border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">TestHub</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Simulated tests that feel like the real exam. Choose a category, pick a test, and start practicing.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-grow">
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? "btn-glossy-primary"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                    {test.category}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      test.difficulty === "Easy"
                        ? "text-green-700 bg-green-50"
                        : test.difficulty === "Medium"
                        ? "text-yellow-700 bg-yellow-50"
                        : "text-red-700 bg-red-50"
                    }`}
                  >
                    {test.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#2D1B69] mb-2 leading-snug">{test.title}</h3>
                <p className="text-gray-400 text-xs mb-4">{test.series}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                  <span>{test.questions} Qs</span>
                  <span>{test.duration} min</span>
                </div>

                <button
                  onClick={() => handleAttempt(test.id)}
                  className="btn-glossy-primary w-full text-sm py-2.5"
                >
                  Start Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modalTestId && (
        <LoginRequiredModal
          returnTo={`/testhub/tests/${modalTestId}/brief`}
          onClose={() => setModalTestId(null)}
        />
      )}

      <Footer />
    </main>
  );
}

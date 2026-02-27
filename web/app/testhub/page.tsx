"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { useAuthStatus } from "@/lib/auth/useAuthStatus";
import LoginRequiredModal from "@/components/testhub/LoginRequiredModal";
import UnlockAccessModal from "@/components/testhub/UnlockAccessModal";

interface TestItem {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  series: string | null;
  durationMinutes: number;
  totalQuestions: number;
  difficulty: string;
  accessType: "FREE" | "LOCKED";
  languageAvailable: "EN" | "TE" | "BOTH";
}

export default function TestHubPage() {
  const router = useRouter();
  const { isAuthed } = useAuthStatus();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [loginModalTestId, setLoginModalTestId] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTests() {
      try {
        const res = await fetch("/api/testhub/tests");
        if (res.ok) {
          const data = await res.json();
          setTests(data.tests);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, []);

  const categories = Array.from(new Set(tests.map((t) => t.category).filter(Boolean))) as string[];

  const filteredTests =
    selectedCategory === "All"
      ? tests
      : tests.filter((t) => t.category === selectedCategory);

  function handleAttempt(test: TestItem) {
    if (isAuthed === false) {
      setLoginModalTestId(test.id);
      return;
    }

    if (test.accessType === "LOCKED") {
      setShowUnlockModal(true);
      return;
    }

    router.push(`/testhub/tests/${test.id}/brief`);
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-gray-400 text-sm">Loading tests...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => {
              const isLocked = test.accessType === "LOCKED";

              return (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${
                    isLocked ? "opacity-90" : ""
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                          {test.category || "General"}
                        </span>
                        {isLocked ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Locked
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                            Free Access
                          </span>
                        )}
                      </div>
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
                    <p className="text-gray-400 text-xs mb-4">{test.series || ""}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                      <span>{test.totalQuestions} Qs</span>
                      <span>{test.durationMinutes} min</span>
                    </div>

                    <button
                      onClick={() => handleAttempt(test)}
                      className="btn-glossy-primary w-full text-sm py-2.5"
                    >
                      {isLocked ? "View Access" : "Start Test"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {loginModalTestId && (
        <LoginRequiredModal
          returnTo={`/testhub/tests/${loginModalTestId}/brief`}
          onClose={() => setLoginModalTestId(null)}
        />
      )}

      {showUnlockModal && (
        <UnlockAccessModal onClose={() => setShowUnlockModal(false)} />
      )}

      <Footer />
    </main>
  );
}

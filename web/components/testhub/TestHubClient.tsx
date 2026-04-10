"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/lib/auth/useAuthStatus";
import LoginRequiredModal from "./LoginRequiredModal";
import UnlockAccessModal from "./UnlockAccessModal";
import type { StudentTestItem } from "@/lib/testhubDb";

interface TestHubClientProps {
  initialTests: StudentTestItem[];
}

export default function TestHubClient({ initialTests }: TestHubClientProps) {
  const router = useRouter();
  const { isAuthed } = useAuthStatus();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [loginModalTestId, setLoginModalTestId] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const tests = initialTests;
  const categories = Array.from(new Set(tests.map((t) => t.category).filter(Boolean))) as string[];

  const filteredTests =
    selectedCategory === "All"
      ? tests
      : tests.filter((t) => t.category === selectedCategory);

  function formatScheduledDate(iso: string): string {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " IST";
  }

  function handleAttempt(test: StudentTestItem) {
    if (test.scheduledUntil) return;

    if (isAuthed === false) {
      setLoginModalTestId(test.id);
      return;
    }

    if (test.accessState === "locked") {
      setShowUnlockModal(true);
      return;
    }

    router.push(`/testhub/tests/${test.id}/brief`);
  }

  return (
    <>
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
          {filteredTests.map((test) => {
            const isScheduled = !!test.scheduledUntil;
            const isLocked = !isScheduled && test.accessState === "locked";
            const isPurchased = !isScheduled && test.accessState === "purchased";

            return (
              <div
                key={test.id}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${
                  isLocked ? "opacity-90" : ""
                }`}
              >
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                        {test.category || "General"}
                      </span>
                      {isScheduled ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                          </svg>
                          Coming Soon
                        </span>
                      ) : isLocked ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Locked
                        </span>
                      ) : isPurchased ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Purchased
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          Free
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

                  <h3 className="text-base font-bold text-[#2D1B69] mb-2 leading-snug line-clamp-2 min-h-[48px]">{test.title}</h3>
                  <p className="text-gray-400 text-xs mb-4">{test.series || ""}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{test.totalQuestions} Qs</span>
                    <span>{test.durationMinutes} min</span>
                  </div>

                  <div className="flex-grow" />

                  <button
                    onClick={() => !test.attemptsExhausted && handleAttempt(test)}
                    disabled={isScheduled || (!isLocked && test.attemptsExhausted)}
                    className={`w-full text-sm py-2.5 mt-4 btn-glossy-primary ${
                      isScheduled || (!isLocked && test.attemptsExhausted)
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isScheduled
                      ? `Unlocks ${formatScheduledDate(test.scheduledUntil!)}`
                      : isLocked
                      ? "View Access"
                      : test.attemptsExhausted
                      ? "Attempts Exhausted"
                      : test.hasActiveAttempt
                      ? "Resume Test"
                      : test.completedAttempts > 0
                      ? "Reattempt"
                      : "Start Test"}
                  </button>
                  {isScheduled && (
                    <p className="text-center text-xs text-orange-500 mt-2">
                      Unlocks {formatScheduledDate(test.scheduledUntil!)}
                    </p>
                  )}
                  {isLocked && (
                    <p className="text-center text-xs text-gray-400 mt-2">Premium plan required</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </>
  );
}

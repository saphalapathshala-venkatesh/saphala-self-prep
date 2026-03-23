import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import LoginSuccessToast from "@/components/dashboard/LoginSuccessToast";
import { getDashboardData } from "@/lib/dashboardData";
import { getActiveCourses } from "@/lib/courseDb";
import { getDailyPractice, type PracticeSuggestion } from "@/lib/practiceDb";
import { getUserStreak, type UserStreak } from "@/lib/streakDb";
import { getDashboardLiveClass, type LiveClassStudent } from "@/lib/liveClassDb";
import { PRODUCTS, ROUTES } from "@/config/terminology";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

function formatMemberSince(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

function ScoreBadge({ correct, wrong, total }: { correct: number; wrong: number; total: number }) {
  if (correct === 0 && wrong === 0) {
    return <span className="text-xs text-gray-400 italic">Score pending</span>;
  }
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const color =
    pct >= 70
      ? "text-green-700 bg-green-50"
      : pct >= 40
      ? "text-yellow-700 bg-yellow-50"
      : "text-red-700 bg-red-50";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {correct}/{total} · {pct}%
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [data, freeCourses, practiceSuggestions, streak, dashboardClass] = await Promise.all([
    getDashboardData(user.id),
    getActiveCourses({ productCategory: "FREE_DEMO", limit: 4 }),
    getDailyPractice(user.id),
    getUserStreak(user.id),
    getDashboardLiveClass(user.id),
  ]);

  const salutation =
    user.gender === "Male" ? "Mr. " : user.gender === "Female" ? "Ms. " : "";
  const firstName = user.fullName?.split(" ")[0] ?? user.fullName ?? null;
  const greeting = firstName
    ? `Welcome back, ${salutation}${firstName}`
    : "Welcome back";

  const displayName = user.fullName ?? user.email ?? user.mobile ?? "Student";
  const xpDisplay = data.xpTotal > 0 ? String(data.xpTotal) : "0";
  const accuracyDisplay = data.accuracyPct !== null ? `${data.accuracyPct}%` : "—";
  const hasAttempts = data.attemptCount > 0;

  const liveProducts = [
    {
      label: PRODUCTS.flashcards,
      sub: "Interactive flashcard decks",
      href: ROUTES.flashcards,
      live: true,
    },
    {
      label: PRODUCTS.ebooks,
      sub: "Concept-based reading material",
      href: ROUTES.ebooks,
      live: true,
    },
    {
      label: PRODUCTS.pdfs,
      sub: "PDF study materials for download",
      href: ROUTES.pdfs,
      live: true,
    },
    {
      label: "Live Classes",
      sub: "Join faculty-led live sessions",
      href: "/live-classes",
      live: true,
    },
    {
      label: "Recorded Videos",
      sub: "Watch recorded lessons anytime",
      href: "/videos",
      live: true,
    },
  ];

  return (
    <>
      <Suspense>
        <LoginSuccessToast displayName={displayName} />
      </Suspense>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <p className="text-purple-300 text-xs font-semibold uppercase tracking-widest mb-1">
            Saphala Self Prep
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">{greeting}!</h1>
          <p className="text-purple-200 text-sm mb-6 max-w-lg">
            {data.activeAttempt
              ? `You have an ongoing exam: "${data.activeAttempt.testTitle}". Pick up where you left off.`
              : hasAttempts
              ? "Every test you attempt brings you closer to your goal. Keep going."
              : "Start your first practice test today and build your exam confidence."}
          </p>
          <div className="flex flex-wrap gap-3">
            {data.activeAttempt ? (
              <Link
                href={`/testhub/tests/${data.activeAttempt.testId}/attempt`}
                className="inline-flex items-center gap-2 bg-white text-[#2D1B69] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume Exam
              </Link>
            ) : (
              <Link
                href={ROUTES.testHub}
                className="inline-flex items-center gap-2 bg-white text-[#2D1B69] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Continue to TestHub
              </Link>
            )}
            <Link
              href={ROUTES.testHub}
              className="inline-flex items-center gap-2 border border-purple-400 text-purple-100 hover:border-purple-200 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Browse Free Tests
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Tests Attempted"
            value={String(data.attemptCount)}
            subtitle={data.attemptCount === 0 ? "Start your first test" : `${data.attemptCount} completed`}
            icon="check"
            color="purple"
            isReal
          />
          <MetricCard
            label="XP Earned"
            value={xpDisplay}
            subtitle={data.xpTotal > 0 ? "Keep learning to earn more" : "Complete tests & flashcards to earn XP"}
            icon="star"
            color="amber"
            isReal={data.xpHasLedger}
          />
          <MetricCard
            label="Accuracy"
            value={accuracyDisplay}
            subtitle={
              data.accuracyPct !== null
                ? data.accuracyPct >= 70
                  ? "Excellent performance"
                  : "Keep practicing to improve"
                : "Appears after your first test"
            }
            icon="target"
            color="blue"
            isReal={data.accuracyPct !== null}
          />
          <MetricCard
            label="Sadhana Streak"
            value={streak.current === 0 ? "0 days" : `${streak.current} day${streak.current !== 1 ? "s" : ""}`}
            subtitle={
              streak.current === 0
                ? "Begin today and build momentum"
                : streak.todayActive
                ? `Best: ${streak.longest} days · Active today!`
                : `Best: ${streak.longest} days · Keep it alive!`
            }
            icon="flame"
            color="orange"
            isReal={streak.current > 0}
          />
        </div>

        {/* Sadhana Streak — 7-day activity strip */}
        <StreakStrip streak={streak} />

        {/* Resume card */}
        {data.activeAttempt && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                Exam In Progress
              </p>
              <p className="text-sm font-bold text-gray-800 truncate">
                {data.activeAttempt.testTitle}
              </p>
              {data.activeAttempt.endsAt && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Expires: {formatDate(data.activeAttempt.endsAt)}
                </p>
              )}
            </div>
            <Link
              href={`/testhub/tests/${data.activeAttempt.testId}/attempt`}
              className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Resume
            </Link>
          </div>
        )}

        {/* ── Your Daily Practice ─────────────────────────────────────── */}
        {practiceSuggestions.length > 0 && (
          <DailyPracticeCard suggestions={practiceSuggestions} />
        )}

        {/* ── Live Classes Dashboard Card ────────────────────────────── */}
        {dashboardClass && <DashboardLiveClassCard cls={dashboardClass} />}

        {/* Start Learning — free courses */}
        {freeCourses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#2D1B69]">Start Learning</h2>
                <p className="text-xs text-gray-400 mt-0.5">Free courses available for you right now</p>
              </div>
              <Link
                href={ROUTES.courses}
                className="text-xs font-semibold text-[#6D4BCB] border border-[#6D4BCB] hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                All Courses
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {freeCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {course.thumbnailUrl ? (
                    <div className="h-24 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={course.thumbnailUrl} alt={course.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center px-3">
                      <span className="text-white font-semibold text-xs text-center line-clamp-3">{course.name}</span>
                    </div>
                  )}
                  <div className="p-3 flex flex-col flex-1 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Free</span>
                      {course.categoryName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{course.categoryName}</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#2D1B69] leading-snug group-hover:text-[#6D4BCB] transition-colors line-clamp-2">
                      {course.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-400">
                      {course.hasHtmlCourse && <span>📖 Ebooks</span>}
                      {course.hasPdfCourse && <span>📄 PDFs</span>}
                      {course.hasFlashcardDecks && <span>🃏 Cards</span>}
                      {course.hasVideoCourse && <span>🎬 Video</span>}
                      {course.hasTestSeries && <span>✏️ Tests</span>}
                    </div>
                    <span className="mt-auto block text-center text-[11px] font-bold py-1.5 rounded-lg bg-green-600 text-white group-hover:bg-green-700 transition-colors">
                      Start Free →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Recent Attempts + Motivational card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h2 className="text-base font-bold text-[#2D1B69]">Recent Attempts</h2>
                {hasAttempts && (
                  <Link
                    href={ROUTES.attempts}
                    className="text-xs font-semibold text-[#6D4BCB] border border-[#6D4BCB] hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View All
                  </Link>
                )}
              </div>

              {data.recentAttempts.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {data.recentAttempts.map((attempt) => {
                    const total =
                      attempt.correctCount + attempt.wrongCount + attempt.unansweredCount;
                    return (
                      <div key={attempt.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#2D1B69] truncate">
                            {attempt.testTitle}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {attempt.category ? `${attempt.category} · ` : ""}
                            {formatDate(attempt.submittedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ScoreBadge correct={attempt.correctCount} wrong={attempt.wrongCount} total={total} />
                          <Link
                            href={`/testhub/tests/${attempt.testId}/review?attemptId=${attempt.id}`}
                            className="text-xs font-medium text-[#6D4BCB] hover:underline"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">No attempts yet</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Your test history will appear here once you complete your first exam.
                  </p>
                  <Link
                    href={ROUTES.testHub}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6D4BCB] hover:bg-[#5C3DB5] px-4 py-2 rounded-xl transition-colors"
                  >
                    Start a Free Test
                  </Link>
                </div>
              )}
            </div>

            {/* Motivational card */}
            <div className="relative bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] rounded-2xl p-6 overflow-hidden text-white">
              <div className="absolute right-0 top-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="80" cy="20" r="40" />
                  <circle cx="20" cy="80" r="30" />
                </svg>
              </div>
              <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-2">
                Your Mentor Says
              </p>
              <p className="text-base font-semibold leading-relaxed mb-4 max-w-sm">
                {hasAttempts
                  ? "Consistency beats intensity. A daily practice session — even 30 minutes — compounds into mastery over time."
                  : "The first step is always the hardest. Take your first practice test today — it is the foundation of all future success."}
              </p>
              <Link
                href={ROUTES.testHub}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {hasAttempts ? "Continue Practice" : "Take First Test"}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right: Profile card + Products */}
          <div className="space-y-4">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#6D4BCB]">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2D1B69] truncate">{displayName}</p>
                  <p className="text-xs text-gray-400">Student</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-500">
                {user.email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                {user.state && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{user.state}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined {formatMemberSince(user.createdAt)}</span>
                </div>
              </div>
              <Link
                href={ROUTES.profile}
                className="mt-4 block text-center text-xs font-semibold text-[#6D4BCB] border border-[#6D4BCB] hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                View Full Profile
              </Link>
            </div>

            {/* XP Breakdown — redesigned */}
            <div className="rounded-2xl overflow-hidden border border-purple-200 shadow-sm">

              {/* Purple gradient header */}
              <div
                className="px-5 pt-5 pb-5"
                style={{ background: "linear-gradient(135deg, #2D1B69 0%, #6D4BCB 100%)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">
                    Sadhana Points
                  </span>
                </div>

                <p className="text-3xl font-black text-white leading-none tabular-nums">
                  {data.xpBreakdown.total.toLocaleString("en-IN")}
                  <span className="text-base font-semibold text-purple-300 ml-2">XP</span>
                </p>
                <p className="text-[10px] text-purple-300 mt-1">
                  Earned across tests, flashcards, ebooks &amp; video lessons
                </p>

                {/* Progress bar → 25 000 XP milestone */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-purple-300 mb-1.5">
                    <span>Progress to Reward</span>
                    <span>
                      {Math.min(data.xpBreakdown.total, 25000).toLocaleString("en-IN")} / 25,000 XP
                    </span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.min((data.xpBreakdown.total / 25000) * 100, 100)}%`,
                        minWidth: data.xpBreakdown.total > 0 ? "6px" : "0",
                      }}
                    />
                  </div>
                  {data.xpBreakdown.total >= 25000 && (
                    <p className="text-[10px] text-amber-300 font-semibold mt-1.5">
                      🎉 Milestone reached — discount unlocked!
                    </p>
                  )}
                </div>
              </div>

              {/* Reward info banner */}
              <div className="flex items-start gap-3 bg-amber-50 border-b border-amber-100 px-5 py-3.5">
                <svg
                  className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v13m0-13V6a4 4 0 00-4-4H5.45a2 2 0 00-1.6 3.2L6 8h6zm0 0V6a4 4 0 014-4h2.55a2 2 0 011.6 3.2L18 8h-6zm-7 0h14M5 8h14a1 1 0 011 1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a1 1 0 011-1z"
                  />
                </svg>
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    Unlock Course Discounts at 25,000 XP
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                    Redeem your Sadhana Points for a <strong>1%–3% discount</strong> on course
                    purchases — applied directly at checkout.
                  </p>
                </div>
              </div>

              {/* Breakdown rows */}
              <div className="bg-white px-5 py-4 space-y-2.5">
                <XpRow label="Total XP" value={data.xpBreakdown.total} bold />
                <div className="border-t border-gray-50 pt-2.5 space-y-2.5">
                  <XpRow label="TestHub" value={data.xpBreakdown.testHub} />
                  <XpRow label="Flashcards" value={data.xpBreakdown.flashcards} />
                  <XpRow label="Ebooks" value={data.xpBreakdown.ebooks} />
                  <XpRow label="Pathshala" value={data.xpBreakdown.pathshala} />
                </div>
              </div>
            </div>

            {/* Products quick-access */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Study Tools
                </p>
                <Link
                  href={ROUTES.courses}
                  className="text-[10px] font-semibold text-[#6D4BCB] border border-[#6D4BCB] hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {liveProducts.map((item) =>
                  item.live && item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6D4BCB] flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#2D1B69] group-hover:text-[#6D4BCB] transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-gray-400">{item.sub}</p>
                      </div>
                      <svg
                        className="w-3 h-3 text-gray-300 group-hover:text-[#6D4BCB] transition-colors ml-auto flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <div key={item.label} className="flex items-center gap-3 opacity-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-300 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">{item.label}</p>
                        <p className="text-[10px] text-gray-400">{item.sub}</p>
                      </div>
                      <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider ml-auto">
                        Soon
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Free Tests */}
        {data.freeTests.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#2D1B69]">Recommended Free Tests</h2>
              <Link
                href={ROUTES.testHub}
                className="text-xs font-semibold text-[#6D4BCB] border border-[#6D4BCB] hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.freeTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      Free
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
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
                  <h3 className="text-sm font-semibold text-[#2D1B69] mb-1 leading-snug line-clamp-2">
                    {test.title}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {test.totalQuestions} Qs · {test.durationMinutes} min
                  </p>
                  <Link
                    href={`/testhub/tests/${test.id}/brief`}
                    className="block text-center text-xs font-semibold text-white bg-[#6D4BCB] hover:bg-[#5C3DB5] px-3 py-2 rounded-lg transition-colors"
                  >
                    Start Test
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ── Dashboard Live Class Card ─────────────────────────────────────────────────

function DashboardLiveClassCard({ cls }: { cls: LiveClassStudent }) {
  const isLive      = cls.liveStatus === "LIVE_NOW"  && cls.isEntitled;
  const isUpcoming  = cls.liveStatus === "UPCOMING"  && cls.isEntitled;
  const isCompleted = cls.liveStatus === "COMPLETED" || cls.liveStatus === "ENDED";
  const isLocked    = !cls.isEntitled || cls.liveStatus === "LOCKED";

  function formatDate(sessionDate: Date | null, startTime: string | null) {
    if (!sessionDate) return "Date TBA";
    const d = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(sessionDate));
    return startTime ? `${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(sessionDate))} · ${startTime} IST` : d;
  }

  const accentColor = isLive ? "border-red-200 bg-red-50/30" : isLocked ? "border-amber-200 bg-amber-50/20" : "border-[#E0D5FF] bg-[#F6F2FF]/50";

  return (
    <div className={`rounded-2xl border p-5 ${accentColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
          <h2 className={`text-sm font-bold ${isLive ? "text-red-700" : "text-[#2D1B69]"}`}>
            {isLive ? "Class Happening Now" : "Upcoming Live Class"}
          </h2>
        </div>
        <Link
          href="/live-classes"
          className="text-xs font-semibold text-[#6D4BCB] hover:text-[#5C3DB5] transition-colors"
        >
          All Classes →
        </Link>
      </div>

      {/* Class info */}
      <div className="flex items-start gap-4">
        {/* Video icon / thumbnail */}
        <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center ${
          isLive ? "bg-red-100" : isLocked ? "bg-amber-100" : "bg-purple-100"
        }`}>
          {isLocked ? (
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className={`w-6 h-6 ${isLive ? "text-red-500" : "text-[#6D4BCB]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {isLive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                <span className="w-1 h-1 rounded-full bg-white" />LIVE NOW
              </span>
            )}
            {isUpcoming && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Upcoming</span>
            )}
            {isCompleted && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Completed</span>
            )}
            {isLocked && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Enrollment Required</span>
            )}
            {cls.platform === "ZOOM" && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-600 text-white leading-none">Zoom</span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-[#2D1B69] leading-snug line-clamp-1">{cls.title}</p>

          {/* Faculty */}
          {cls.facultyName && (
            <p className="text-xs text-gray-500">
              {cls.facultyTitle ? `${cls.facultyTitle} ` : ""}{cls.facultyName}
            </p>
          )}

          {/* Date / time */}
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(cls.sessionDate, cls.startTime)}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4">
        {isLive && cls.canJoin && cls.joinUrl ? (
          <a
            href={cls.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            Join LIVE Class
          </a>
        ) : isLive && !cls.canJoin ? (
          <button disabled className="w-full px-4 py-2.5 rounded-xl bg-red-100 text-red-400 text-sm font-semibold cursor-not-allowed">
            Preparing join link…
          </button>
        ) : isUpcoming ? (
          <button disabled className="w-full px-4 py-2.5 rounded-xl bg-blue-100 text-blue-400 text-sm font-semibold cursor-not-allowed text-center">
            Join available at {cls.startTime ? `${cls.startTime} IST` : "class time"}
          </button>
        ) : isLocked ? (
          <Link
            href="/live-classes"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors"
          >
            View Class →
          </Link>
        ) : isCompleted && cls.replayVideoId ? (
          <Link
            href={`/live-classes/${cls.id}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white text-sm font-semibold transition-colors"
          >
            Watch Replay
          </Link>
        ) : (
          <Link
            href="/live-classes"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white text-sm font-semibold transition-colors"
          >
            View Classes →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Practice card config ──────────────────────────────────────────────────────

const PRACTICE_CONFIG = {
  test: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    iconBg: "bg-purple-100 text-[#6D4BCB]",
    badge: "Test",
    badgeColor: "bg-purple-100 text-purple-700",
    ctaColor: "bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white",
  },
  flashcard: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
      </svg>
    ),
    iconBg: "bg-yellow-100 text-yellow-600",
    badge: "Flashcards",
    badgeColor: "bg-yellow-100 text-yellow-700",
    ctaColor: "bg-yellow-500 hover:bg-yellow-600 text-white",
  },
  ebook: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    iconBg: "bg-green-100 text-green-600",
    badge: "E-Book",
    badgeColor: "bg-green-100 text-green-700",
    ctaColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
} as const;

const REASON_PILL: Record<string, string> = {
  new:    "bg-blue-50 text-blue-700",
  retry:  "bg-amber-50 text-amber-700",
  revise: "bg-gray-100 text-gray-600",
};

function DailyPracticeCard({ suggestions }: { suggestions: PracticeSuggestion[] }) {
  return (
    <section>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2D1B69] leading-tight">Your Daily Practice</h2>
            <p className="text-[11px] text-gray-400">Picked to help you improve today</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide">
          {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Suggestion rows */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {suggestions.map((s, idx) => {
          const cfg = PRACTICE_CONFIG[s.type];
          return (
            <div key={`${s.type}-${s.id}-${idx}`} className="flex items-center gap-4 px-5 py-4">
              {/* Type icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
                    {cfg.badge}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REASON_PILL[s.reasonKind]}`}>
                    {s.reason}
                  </span>
                  {s.meta && (
                    <span className="text-[10px] text-gray-400">{s.meta}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#2D1B69] truncate leading-snug">
                  {s.title}
                </p>
              </div>

              {/* CTA */}
              <Link
                href={s.href}
                className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${cfg.ctaColor}`}
              >
                {s.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({
  label, value, subtitle, icon, color, isReal,
}: {
  label: string; value: string; subtitle: string; icon: string; color: string; isReal: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    purple: { bg: "bg-purple-100", text: "text-[#6D4BCB]" },
    amber: { bg: "bg-amber-100", text: "text-amber-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-500" },
  };
  const { bg, text } = colorMap[color] ?? colorMap.purple;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 relative overflow-hidden">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bg} ${text}`}>
        <MetricIcon name={icon} />
      </div>
      <p className={`text-xl font-bold text-[#2D1B69] leading-tight ${!isReal ? "opacity-50" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{subtitle}</p>
      {!isReal && (
        <span className="absolute top-3 right-3 text-[9px] font-semibold text-gray-300 uppercase tracking-wider">
          Soon
        </span>
      )}
    </div>
  );
}

function StreakStrip({ streak }: { streak: UserStreak }) {
  // Build last-7-days array in IST, starting from 6 days ago → today
  const days: { dateStr: string; label: string; active: boolean; isToday: boolean }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
    const label = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).slice(0, 2);
    days.push({
      dateStr,
      label,
      active: streak.activeDaysLast7.includes(dateStr),
      isToday: i === 0,
    });
  }

  if (streak.current === 0 && streak.activeDaysLast7.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <div>
            <p className="text-sm font-bold text-[#2D1B69] leading-none">
              Sadhana Streak
              {streak.current > 0 && (
                <span className="ml-2 text-orange-500">{streak.current} day{streak.current !== 1 ? "s" : ""}</span>
              )}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {streak.current > 0
                ? streak.todayActive
                  ? "You studied today — amazing!"
                  : "Study today to keep your streak alive"
                : "Start studying to begin your streak"}
              {streak.longest > 1 && (
                <span className="ml-1 text-gray-300">· Best: {streak.longest} days</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 7-day dot strip */}
      <div className="flex items-end gap-1.5">
        {days.map((day) => (
          <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className={`w-full rounded-md transition-all ${
                day.active
                  ? day.isToday
                    ? "bg-orange-500 h-7"
                    : "bg-orange-400 h-6"
                  : day.isToday
                  ? "bg-orange-100 h-5 border border-orange-300 border-dashed"
                  : "bg-gray-100 h-4"
              }`}
            />
            <span className={`text-[9px] font-semibold ${day.isToday ? "text-orange-500" : "text-gray-400"}`}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function XpRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? "font-bold text-[#2D1B69]" : "text-gray-500"}`}>{label}</span>
      <span className={`text-xs font-semibold ${bold ? "text-amber-600" : value > 0 ? "text-amber-500" : "text-gray-300"}`}>
        {value > 0 ? `+${value}` : "—"} {value > 0 ? "XP" : ""}
      </span>
    </div>
  );
}

function MetricIcon({ name }: { name: string }) {
  const cn = "w-4 h-4";
  switch (name) {
    case "star":
      return <svg className={cn} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
    case "flame":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>;
    case "check":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case "target":
      return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
    default:
      return null;
  }
}

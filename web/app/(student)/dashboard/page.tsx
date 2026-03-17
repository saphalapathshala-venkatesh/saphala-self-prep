import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import LoginSuccessToast from "@/components/dashboard/LoginSuccessToast";
import { getDashboardData } from "@/lib/dashboardData";
import { PRODUCTS, ROUTES } from "@/config/terminology";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

function formatMemberSince(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
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

  const data = await getDashboardData(user.id);

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
      label: PRODUCTS.pathshala,
      sub: "Video lessons by faculty",
      href: null,
      live: false,
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
            value="0 days"
            subtitle="Begin today and build momentum"
            icon="flame"
            color="orange"
            isReal={false}
          />
        </div>

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

            {/* XP Breakdown */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <p className="text-sm font-bold text-[#2D1B69]">XP Breakdown</p>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
                XP = Experience Points (Sadhana Points), a reward for your time, effort and hard work
              </p>
              <div className="space-y-2.5">
                <XpRow label="Total XP" value={data.xpBreakdown.total} bold />
                <div className="border-t border-gray-50 pt-2.5 space-y-2.5">
                  <XpRow label="TestHub XP" value={data.xpBreakdown.testHub} />
                  <XpRow label="Flashcard XP" value={data.xpBreakdown.flashcards} />
                  <XpRow label="Ebooks XP" value={data.xpBreakdown.ebooks} />
                  <XpRow label="Pathshala XP" value={data.xpBreakdown.pathshala} />
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

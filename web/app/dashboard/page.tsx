import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPublishedTestsForStudent } from "@/lib/testhubDb";
import { prisma } from "@/lib/db";
import DashboardShell from "@/components/dashboard/DashboardShell";
import LoginSuccessToast from "./LoginSuccessToast";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const tests = await getPublishedTestsForStudent();
  const freeTests = tests.filter((t) => t.accessType === "FREE");

  const attemptCount = await prisma.attempt.count({
    where: { userId: user.id, status: "SUBMITTED" },
  });

  let greeting = "Welcome back";
  if (user.fullName) {
    const salutation =
      user.gender === "Male" ? "Mr. " :
      user.gender === "Female" ? "Ms. " : "";
    greeting = `Welcome back, ${salutation}${user.fullName}`;
  }

  const displayName = user.fullName ?? user.email ?? user.mobile ?? "Student";

  return (
    <DashboardShell userName={displayName}>
      <section className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] text-white py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">
            {greeting}!
          </h1>
          <p className="text-purple-200 text-sm">
            Ready to continue your preparation? Pick up where you left off.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Suspense>
          <LoginSuccessToast displayName={displayName} />
        </Suspense>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="XP Earned" value="0" icon="star" color="purple" />
          <StatCard label="Sadhana Streak" value="0 days" icon="flame" color="orange" />
          <StatCard label="Tests Attempted" value={String(attemptCount)} icon="check" color="green" />
          <StatCard label="Accuracy" value="—" icon="target" color="blue" />
        </div>

        <section>
          <h2 className="text-base font-bold text-[#2D1B69] mb-3">Saphala Self Prep</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProductCard
              title="Smart Learning"
              description="Concept lessons, flashcards, and structured study paths"
              href="/smart-learning"
              icon="brain"
              color="purple"
              comingSoon
            />
            <ProductCard
              title="TestHub"
              description={`${tests.length} practice test${tests.length !== 1 ? "s" : ""} ready — simulate the real exam`}
              href="/testhub"
              icon="clipboard"
              color="indigo"
            />
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#2D1B69] mb-3">Saphala Learn</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProductCard
              title="Pathshala"
              description="Premium video lessons by expert faculty"
              href="/pathshala"
              icon="play"
              color="pink"
              comingSoon
            />
            <ProductCard
              title="Prep Library"
              description="PDFs, notes, and downloadable study materials"
              href="/prep-library"
              icon="book"
              color="teal"
              comingSoon
            />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#2D1B69]">Available Free Tests</h2>
            <Link
              href="/testhub"
              className="text-sm text-[#6D4BCB] hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          {freeTests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeTests.slice(0, 3).map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      Free
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      test.difficulty === "Easy" ? "text-green-700 bg-green-50" :
                      test.difficulty === "Medium" ? "text-yellow-700 bg-yellow-50" :
                      "text-red-700 bg-red-50"
                    }`}>
                      {test.difficulty}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D1B69] mb-1 leading-snug">
                    {test.title}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {test.totalQuestions} Qs · {test.durationMinutes} min
                  </p>
                  <Link
                    href={`/testhub/tests/${test.id}/brief`}
                    className="btn-glossy-primary w-full text-xs py-2 text-center block"
                  >
                    Start Test
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500 text-sm mb-3">No free tests available right now.</p>
              <Link href="/testhub" className="text-sm text-[#6D4BCB] hover:underline font-medium">
                Browse all tests →
              </Link>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    purple: "bg-purple-100 text-[#6D4BCB]",
    orange: "bg-orange-100 text-orange-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${bgMap[color]}`}>
        <StatIcon name={icon} />
      </div>
      <p className="text-lg sm:text-xl font-bold text-[#2D1B69] leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  const cn = "w-4 h-4";
  switch (name) {
    case "star":
      return (
        <svg className={cn} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case "flame":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      );
    case "check":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "target":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

function ProductCard({
  title,
  description,
  href,
  icon,
  color,
  comingSoon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
}) {
  const bgMap: Record<string, string> = {
    purple: "bg-purple-100 text-[#6D4BCB]",
    indigo: "bg-indigo-100 text-indigo-600",
    pink: "bg-pink-100 text-pink-600",
    teal: "bg-teal-100 text-teal-600",
  };

  const content = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 transition-shadow ${comingSoon ? "opacity-75" : "hover:shadow-md group"}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bgMap[color]}`}>
          <ProductIcon name={icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${comingSoon ? "text-gray-500" : "text-[#2D1B69] group-hover:text-[#6D4BCB]"} transition-colors`}>
              {title}
            </h3>
            {comingSoon && (
              <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-none font-medium">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );

  if (comingSoon) return content;

  return <Link href={href}>{content}</Link>;
}

function ProductIcon({ name }: { name: string }) {
  const cn = "w-5 h-5";
  switch (name) {
    case "brain":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "play":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "book":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    default:
      return null;
  }
}

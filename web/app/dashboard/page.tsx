import { Suspense } from "react";
import { Header } from "@/ui-core/Header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPublishedTestsForStudent } from "@/lib/testhubDb";
import LogoutButton from "./LogoutButton";
import LoginSuccessToast from "./LoginSuccessToast";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const tests = await getPublishedTestsForStudent();
  const freeTests = tests.filter((t) => t.accessType === "FREE");
  const firstName = (user.email ?? "Student").split("@")[0];

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow">
        <section className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] text-white py-10 px-4">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome back, {firstName}!
            </h1>
            <p className="text-purple-200 text-sm md:text-base">
              Ready to continue your preparation? Pick up where you left off.
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
          <Suspense>
            <LoginSuccessToast email={user.email ?? ""} />
          </Suspense>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/testhub"
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-[#6D4BCB]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="font-semibold text-[#2D1B69] group-hover:text-[#6D4BCB] transition-colors">
                  TestHub
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                {tests.length} test{tests.length !== 1 ? "s" : ""} available
              </p>
            </Link>

            <Link
              href="/courses"
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="font-semibold text-[#2D1B69] group-hover:text-blue-600 transition-colors">
                  Courses
                </span>
              </div>
              <p className="text-gray-500 text-sm">Browse study materials</p>
            </Link>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="font-semibold text-[#2D1B69]">Profile</span>
              </div>
              <p className="text-gray-500 text-sm truncate">{user.email}</p>
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2D1B69]">Free Tests</h2>
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
                <p className="text-gray-500 text-sm">No free tests available right now. Check back soon!</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-[#2D1B69] mb-3">Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">Email</span>
                <p className="font-medium text-gray-800">{user.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Mobile</span>
                <p className="font-medium text-gray-800">+91 {user.mobile}</p>
              </div>
            </div>
            <LogoutButton />
          </section>
        </div>
      </div>
    </main>
  );
}

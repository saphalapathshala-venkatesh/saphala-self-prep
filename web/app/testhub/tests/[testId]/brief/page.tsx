import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDbTestById, resolveTestAccess } from "@/lib/testhubDb";
import Link from "next/link";
import { Header } from "@/ui-core/Header";
import BriefClient from "@/components/testhub/BriefClient";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";

export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ testId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const [{ testId }, sp] = await Promise.all([params, searchParams]);

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/testhub/tests/${testId}/brief`)}`);
  }

  const ctx = parseCourseContext(sp);
  const backHref  = ctx ? courseReturnUrl(ctx) : "/testhub";
  const backLabel = ctx ? "← Back to Course" : "Back to Tests";

  const test = await getDbTestById(testId);

  if (!test) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#2D1B69] mb-2">Test Not Found</h1>
            <p className="text-gray-500 mb-6">The test you are looking for does not exist.</p>
            <Link href={backHref} className="btn-glossy-primary">{backLabel}</Link>
          </div>
        </div>
      </main>
    );
  }

  // Guard: test not yet available (scheduled unlock)
  if (test.scheduledUntil) {
    const openDate = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(test.scheduledUntil));
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center py-10 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-orange-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#2D1B69] mb-3">Not Yet Available</h2>
            <p className="text-gray-500 text-sm mb-2">{test.title}</p>
            <p className="text-gray-400 text-sm mb-8">
              This test opens on <span className="font-semibold text-gray-600">{openDate}</span>. Check back then.
            </p>
            <Link href={backHref} className="btn-glossy-primary px-8 py-3">
              {backLabel}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Guard: series must be published (if test belongs to a series)
  if (test.seriesIsPublished === false) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#2D1B69] mb-2">Test Not Available</h1>
            <p className="text-gray-500 mb-6">This test is not currently available.</p>
            <Link href={backHref} className="btn-glossy-primary">{backLabel}</Link>
          </div>
        </div>
      </main>
    );
  }

  // Access guard: free (series.isFree || test.accessType=FREE) OR valid entitlement
  const access = await resolveTestAccess(test, user.id);
  if (access === "locked") {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center py-10 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#2D1B69] mb-3">Premium Access Required</h2>
            <p className="text-gray-500 text-sm mb-2">{test.title}</p>
            <p className="text-gray-400 text-sm mb-8">
              This test requires a premium plan. Unlock it to start practicing.
            </p>
            <Link href={backHref} className="btn-glossy-primary px-8 py-3">
              {backLabel}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const briefTest = {
    id: test.id,
    title: test.title,
    testCode: test.code || "",
    category: test.category || "NEET",
    series: test.series || "",
    duration: test.durationMinutes,
    questions: test.totalQuestions,
    difficulty: test.difficulty as "Easy" | "Medium" | "Hard",
    accessType: test.accessType,
    isFree: test.isFree,
    marksPerQuestion: test.marksPerQuestion,
    negativeMarks: test.negativeMarks,
    attemptsAllowed: test.attemptsAllowed,
    languageAvailable: test.languageAvailable,
    publishedAt: test.publishedAt ? test.publishedAt.toISOString() : null,
    instructions: test.instructions ?? null,
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow flex items-center justify-center py-10 px-4">
        <BriefClient test={briefTest} backHref={backHref} backLabel={backLabel} />
      </div>
    </main>
  );
}

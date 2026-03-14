import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDbTestById } from "@/lib/testhubDb";
import Link from "next/link";
import { Header } from "@/ui-core/Header";
import BriefClient from "@/components/testhub/BriefClient";

export default async function BriefPage({ params }: { params: Promise<{ testId: string }> }) {
  const user = await getCurrentUser();
  const { testId } = await params;

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/testhub/tests/${testId}/brief`)}`);
  }

  const test = await getDbTestById(testId);

  if (!test) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#2D1B69] mb-2">Test Not Found</h1>
            <p className="text-gray-500 mb-6">The test you are looking for does not exist.</p>
            <Link href="/testhub" className="btn-glossy-primary">Back to TestHub</Link>
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
    marksPerQuestion: test.marksPerQuestion,
    negativeMarks: test.negativeMarks,
    attemptsAllowed: test.attemptsAllowed,
    languageAvailable: test.languageAvailable,
    publishedAt: test.publishedAt ? test.publishedAt.toISOString() : null,
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow flex items-center justify-center py-10 px-4">
        <BriefClient test={briefTest} />
      </div>
    </main>
  );
}

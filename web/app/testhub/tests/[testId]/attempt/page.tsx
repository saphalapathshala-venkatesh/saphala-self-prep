import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDbTestById } from "@/lib/testhubDb";
import Link from "next/link";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import TestAttemptClient from "@/components/testhub/TestAttemptClient";

export default async function AttemptPage({ params }: { params: Promise<{ testId: string }> }) {
  const user = await getCurrentUser();
  const { testId } = await params;

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/testhub/tests/${testId}/attempt`)}`);
  }

  const dbTest = await getDbTestById(testId);

  if (!dbTest) {
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
        <Footer />
      </main>
    );
  }

  const test = {
    id: dbTest.id,
    title: dbTest.title,
    testCode: dbTest.code || "",
    category: dbTest.category || "NEET",
    series: dbTest.series || "",
    duration: dbTest.durationMinutes,
    questions: dbTest.totalQuestions,
    difficulty: dbTest.difficulty as "Easy" | "Medium" | "Hard",
    accessType: dbTest.accessType,
    marksPerQuestion: dbTest.marksPerQuestion,
    negativeMarks: dbTest.negativeMarks,
    attemptsAllowed: dbTest.attemptsAllowed,
    languageAvailable: dbTest.languageAvailable,
  };

  return <TestAttemptClient testId={testId} test={test} />;
}

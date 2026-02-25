import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTestById } from "@/config/testhub";
import Link from "next/link";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";

export default async function BriefPage({ params }: { params: Promise<{ testId: string }> }) {
  const user = await getCurrentUser();
  const { testId } = await params;

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/testhub/tests/${testId}/brief`)}`);
  }

  const test = getTestById(testId);

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
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow flex items-center justify-center py-16 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full p-8">
          <div className="text-center mb-8">
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              {test.category} &middot; {test.series}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#2D1B69] text-center mb-6">{test.title}</h1>

          <div className="bg-[#F6F2FF] rounded-xl p-5 mb-8">
            <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Test Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Questions</span>
                <span className="font-medium text-gray-700">{test.questions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium text-gray-700">{test.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Difficulty</span>
                <span className="font-medium text-gray-700">{test.difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Marks</span>
                <span className="font-medium text-gray-700">{test.questions * 4}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Instructions</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold mt-0.5">1.</span>
                <span>The test is timed. Once started, the timer cannot be paused.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold mt-0.5">2.</span>
                <span>Each correct answer carries 4 marks. Negative marking: -1 for wrong answers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold mt-0.5">3.</span>
                <span>You can mark questions for review and return to them later.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold mt-0.5">4.</span>
                <span>Your results and analysis will be available immediately after submission.</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Link href="/testhub" className="btn-glossy-secondary flex-1 text-center py-3">
              Go Back
            </Link>
            <Link
              href={`/testhub/tests/${test.id}/attempt`}
              className="btn-glossy-primary flex-1 text-center py-3"
            >
              Start Test
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

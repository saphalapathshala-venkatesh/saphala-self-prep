import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTestById } from "@/config/testhub";
import Link from "next/link";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import InstructionsPill from "@/components/testhub/InstructionsPill";

export default async function AttemptPage({ params }: { params: Promise<{ testId: string }> }) {
  const user = await getCurrentUser();
  const { testId } = await params;

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/testhub/tests/${testId}/attempt`)}`);
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
    <main className="min-h-screen flex flex-col bg-white">
      <div className="bg-[#2D1B69] text-white py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-semibold">{test.title}</h1>
              <p className="text-xs text-purple-200">{test.category} &middot; {test.series}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <InstructionsPill test={test} />
            <span className="bg-white/10 rounded-lg px-3 py-1">{test.questions} Qs</span>
            <span className="bg-white/10 rounded-lg px-3 py-1">{test.duration} min</span>
          </div>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#2D1B69] mb-3">Test Environment Ready</h2>
          <p className="text-gray-500 text-sm mb-8">
            The full test-taking interface with questions, timer, and navigation will be available here once question content is added.
          </p>
          <Link href={`/testhub/tests/${test.id}/brief`} className="btn-glossy-secondary">
            Back to Brief
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

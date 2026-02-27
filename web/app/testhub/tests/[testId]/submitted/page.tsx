import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTestById } from "@/config/testhub";
import Link from "next/link";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";

export default async function SubmittedPage({ params }: { params: Promise<{ testId: string }> }) {
  const user = await getCurrentUser();
  const { testId } = await params;

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/testhub/tests/${testId}/submitted`)}`);
  }

  const test = getTestById(testId);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#2D1B69] mb-3">Test Submitted</h1>
          <p className="text-gray-500 text-sm mb-2">
            {test ? test.title : "Your test"} has been submitted successfully.
          </p>
          <p className="text-gray-400 text-xs mb-8">
            Results and detailed analysis will be available soon.
          </p>
          <Link href="/testhub" className="btn-glossy-primary px-8 py-3">
            Back to TestHub
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

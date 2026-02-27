import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import AttemptSummaryClient from "@/components/testhub/AttemptSummaryClient";
import Link from "next/link";

export default async function SubmittedPage({
  params,
  searchParams,
}: {
  params: Promise<{ testId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const user = await getCurrentUser();
  const { testId } = await params;
  const { attemptId } = await searchParams;

  if (!user) {
    const from = attemptId
      ? `/testhub/tests/${testId}/submitted?attemptId=${attemptId}`
      : `/testhub/tests/${testId}/submitted`;
    redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  if (!attemptId) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center py-20 px-4">
          <div className="bg-white rounded-xl p-8 shadow-sm border text-center max-w-md">
            <p className="text-gray-500 mb-4">No attempt specified.</p>
            <Link href="/testhub" className="btn-glossy-primary px-6 py-2.5">Back to TestHub</Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow flex items-center justify-center py-10 px-4">
        <AttemptSummaryClient testId={testId} attemptId={attemptId} />
      </div>
      <Footer />
    </main>
  );
}

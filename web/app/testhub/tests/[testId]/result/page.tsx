import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import ResultPageClient from "@/components/testhub/ResultPageClient";

export default async function ResultPage({
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
      ? `/testhub/tests/${testId}/result?attemptId=${attemptId}`
      : `/testhub/tests/${testId}/result`;
    redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  if (!attemptId) {
    redirect(`/testhub`);
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <ResultPageClient attemptId={attemptId} testId={testId} />
      <Footer />
    </main>
  );
}

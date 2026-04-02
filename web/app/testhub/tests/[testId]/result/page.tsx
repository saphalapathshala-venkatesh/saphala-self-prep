import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDbTestById } from "@/lib/testhubDb";
import { Header } from "@/ui-core/Header";
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

  const test = await getDbTestById(testId);
  const seriesId = test?.seriesId ?? null;

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <ResultPageClient attemptId={attemptId} testId={testId} seriesId={seriesId} />
    </main>
  );
}

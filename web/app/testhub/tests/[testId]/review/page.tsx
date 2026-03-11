import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/ui-core/Header";
import ReviewClient from "@/components/testhub/ReviewClient";

export default async function ReviewPage({
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
      ? `/testhub/tests/${testId}/review?attemptId=${attemptId}`
      : `/testhub/tests/${testId}/review`;
    redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  if (!attemptId) {
    redirect(`/testhub`);
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <ReviewClient attemptId={attemptId} testId={testId} />
    </main>
  );
}

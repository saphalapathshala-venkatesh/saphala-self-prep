import { prisma } from "@/lib/db";
import { getPublishedTestsForStudent } from "@/lib/testhubDb";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";
import TestHubClient from "@/components/testhub/TestHubClient";

export const dynamic = "force-dynamic";

export default async function TestSeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const user = await getCurrentUser();

  // TestSeries is in the Prisma schema — fetch directly.
  const series = await prisma.testSeries
    .findFirst({
      where: { id: seriesId, isPublished: true },
      select: { id: true, title: true, description: true },
    })
    .catch(() => null);

  if (!series) notFound();

  // getPublishedTestsForStudent already applies auth + access state — filter to this series.
  const allTests = await getPublishedTestsForStudent(user?.id);
  const seriesTests = allTests.filter((t) => t.seriesId === seriesId);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Series header */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <Link
            href="/testhub"
            className="text-xs text-[#6D4BCB] hover:text-[#5C3DB5] hover:underline mb-4 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            TestHub
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2D1B69] mb-2 leading-snug">
            {series.title}
          </h1>
          {series.description && (
            <div
              className="text-gray-500 max-w-xl text-sm leading-relaxed rich-html overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: series.description }}
            />
          )}
          {seriesTests.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {seriesTests.length} test{seriesTests.length !== 1 ? "s" : ""} in this series
            </p>
          )}
        </div>
      </section>

      {/* Tests list — reuses TestHubClient which handles auth gates, locked state, etc. */}
      {seriesTests.length === 0 ? (
        <section className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-400 text-lg font-medium">No tests available in this series yet.</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon.</p>
        </section>
      ) : (
        <TestHubClient initialTests={seriesTests} />
      )}

      <Footer />
    </main>
  );
}

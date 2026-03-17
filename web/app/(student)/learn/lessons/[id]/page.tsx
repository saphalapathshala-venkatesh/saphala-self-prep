import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/contentDb";
import { ROUTES, PRODUCTS } from "@/config/terminology";
import Link from "next/link";
import EbookPageShell from "@/components/learn/EbookPageShell";

export const dynamic = "force-dynamic";

export default async function LessonReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLessonById(id);

  if (!lesson) {
    notFound();
  }

  const breadcrumbParts = [
    lesson.breadcrumb.category,
    lesson.breadcrumb.subject,
    lesson.breadcrumb.topic,
    lesson.breadcrumb.subtopic,
  ].filter(Boolean) as string[];

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link
          href={ROUTES.ebooks}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#6D4BCB] mb-6 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          All {PRODUCTS.ebooks}
        </Link>

        <EbookPageShell
          title={lesson.title}
          breadcrumbParts={breadcrumbParts}
          subjectColor={lesson.subjectColor}
          body={
            <div dangerouslySetInnerHTML={{ __html: lesson.body }} />
          }
        />

        {/* Footer nav */}
        <div className="mt-6 flex justify-between items-center">
          <Link
            href={ROUTES.ebooks}
            className="text-sm text-gray-500 hover:text-[#6D4BCB] transition-colors"
          >
            ← Back to {PRODUCTS.ebooks}
          </Link>
          <Link
            href={ROUTES.flashcards}
            className="text-sm text-[#6D4BCB] font-medium hover:underline"
          >
            Try {PRODUCTS.flashcards} →
          </Link>
        </div>
      </div>
    </div>
  );
}

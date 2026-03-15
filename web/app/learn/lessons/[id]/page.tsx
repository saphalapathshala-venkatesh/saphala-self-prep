import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLessonById } from "@/lib/contentDb";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LessonReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, lesson] = await Promise.all([getCurrentUser(), getLessonById(id)]);

  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/learn/lessons/${id}`)}`);
  }

  if (!lesson) {
    notFound();
  }

  const breadcrumbParts = [
    lesson.breadcrumb.category,
    lesson.breadcrumb.subject,
    lesson.breadcrumb.topic,
    lesson.breadcrumb.subtopic,
  ].filter(Boolean);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-grow max-w-4xl">
        {/* Back */}
        <Link
          href="/learn/lessons"
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
          All Lessons
        </Link>

        <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] px-8 py-10">
            {breadcrumbParts.length > 0 && (
              <p className="text-purple-300 text-xs mb-2 truncate">
                {breadcrumbParts.join(" › ")}
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">
              {lesson.title}
            </h1>
          </div>

          {/* Body */}
          <div
            className="prose prose-sm md:prose-base max-w-none px-8 py-8
              prose-headings:text-[#2D1B69] prose-headings:font-bold
              prose-a:text-[#6D4BCB] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[#2D1B69]
              prose-code:bg-purple-50 prose-code:text-[#6D4BCB] prose-code:px-1 prose-code:rounded
              prose-pre:bg-gray-900 prose-pre:text-gray-100
              prose-blockquote:border-l-[#6D4BCB] prose-blockquote:text-gray-600"
            dangerouslySetInnerHTML={{ __html: lesson.body }}
          />
        </article>

        {/* Footer nav */}
        <div className="mt-6 flex justify-between items-center">
          <Link
            href="/learn/lessons"
            className="text-sm text-gray-500 hover:text-[#6D4BCB] transition-colors"
          >
            ← Back to lessons
          </Link>
          <Link
            href="/learn/flashcards"
            className="text-sm text-[#6D4BCB] font-medium hover:underline"
          >
            Try flashcards →
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

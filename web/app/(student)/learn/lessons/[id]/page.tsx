import { notFound, redirect } from "next/navigation";
import { getLessonById, canUserAccessLesson } from "@/lib/contentDb";
import { getCurrentUser } from "@/lib/auth";
import EbookReaderClient from "@/components/learn/EbookReaderClient";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";
import { ROUTES, PRODUCTS } from "@/config/terminology";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LessonReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [user, lesson] = await Promise.all([getCurrentUser(), getLessonById(id)]);

  if (!user) redirect(`/login?from=/learn/lessons/${id}`);
  if (!lesson) notFound();

  const canAccess = await canUserAccessLesson(user.id, lesson);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[#2D1B69] mb-2">{lesson.title}</h1>
          <p className="text-sm text-gray-500 mb-6">
            This ebook is part of a paid course. Purchase the course to get full access to this study material.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6D4BCB] text-white text-sm font-semibold rounded-xl hover:bg-[#5C3DB5] transition-colors"
            >
              Browse Courses
            </Link>
            <Link
              href={ROUTES.ebooks}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back to {PRODUCTS.ebooks}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ctx = parseCourseContext(sp);
  const backHref = ctx ? courseReturnUrl(ctx) : ROUTES.ebooks;

  const breadcrumbParts = [
    lesson.breadcrumb.category,
    lesson.breadcrumb.subject,
    lesson.breadcrumb.topic,
    lesson.breadcrumb.subtopic,
  ].filter(Boolean) as string[];

  return (
    <div className="pt-4 pb-0 px-0">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <EbookReaderClient
          lessonId={lesson.id}
          title={lesson.title}
          subject={lesson.breadcrumb.subject}
          breadcrumbParts={breadcrumbParts}
          subjectColor={lesson.subjectColor}
          xpEnabled={lesson.xpEnabled}
          xpValue={lesson.xpValue}
          chapters={lesson.chapters}
          backHref={backHref}
          backLabel={ctx ? "← Back to Course" : "← Back to Ebooks"}
        />
      </div>
    </div>
  );
}

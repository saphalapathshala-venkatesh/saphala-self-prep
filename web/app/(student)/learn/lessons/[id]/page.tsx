import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/contentDb";
import EbookReaderClient from "@/components/learn/EbookReaderClient";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";
import { ROUTES } from "@/config/terminology";

export const dynamic = "force-dynamic";

export default async function LessonReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const lesson = await getLessonById(id);

  if (!lesson) {
    notFound();
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

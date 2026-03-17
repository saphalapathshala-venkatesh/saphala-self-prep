import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/contentDb";
import EbookReaderClient from "@/components/learn/EbookReaderClient";

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
        <EbookReaderClient
          lessonId={lesson.id}
          title={lesson.title}
          subject={lesson.breadcrumb.subject}
          breadcrumbParts={breadcrumbParts}
          subjectColor={lesson.subjectColor}
          xpEnabled={lesson.xpEnabled}
          xpValue={lesson.xpValue}
          chapters={lesson.chapters}
        />
      </div>
    </div>
  );
}

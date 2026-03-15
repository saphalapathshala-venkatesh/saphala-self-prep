import { getPublishedLessons } from "@/lib/contentDb";
import Link from "next/link";
import LearnPageShell from "@/components/learn/LearnPageShell";
import { PRODUCTS } from "@/config/terminology";

export const dynamic = "force-dynamic";

function Breadcrumb({
  category, subject, topic, subtopic,
}: {
  category: string | null; subject: string | null; topic: string | null; subtopic: string | null;
}) {
  const parts = [category, subject, topic, subtopic].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="text-[10px] text-gray-400 truncate" title={parts.join(" › ")}>
      {parts.join(" › ")}
    </p>
  );
}

export default async function LessonsPage() {
  const lessons = await getPublishedLessons();

  return (
    <LearnPageShell
      productLabel={PRODUCTS.contentLibrary}
      title="Ebooks"
      description="Concept-based reading material. Pick a lesson and read at your own pace."
    >
      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <p className="text-gray-400 font-medium mb-1">No lessons published yet</p>
          <p className="text-gray-400 text-sm">
            New lesson notes are being prepared. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/learn/lessons/${lesson.id}`}
              className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <Breadcrumb {...lesson.breadcrumb} />
                <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-3 mt-0.5 group-hover:text-[#6D4BCB] transition-colors">
                  {lesson.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </LearnPageShell>
  );
}

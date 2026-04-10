import { getPublishedLessons } from "@/lib/contentDb";
import Link from "next/link";
import LearnPageShell from "@/components/learn/LearnPageShell";
import { PRODUCTS } from "@/config/terminology";
import { getSubjectColor, colorTokens } from "@/lib/subjectColor";
import { isTimeLocked, formatUnlockAt } from "@/lib/formatUnlockAt";

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
      title={PRODUCTS.ebooks}
      description="Concept-based reading material. Pick a lesson and read at your own pace."
    >
      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <p className="text-gray-400 font-medium mb-1">No lessons published yet</p>
          <p className="text-gray-400 text-sm">
            New ebooks are being prepared. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {lessons.map((lesson) => {
            const color = getSubjectColor(lesson.subjectColor, lesson.breadcrumb.subject);
            const tokens = colorTokens(color);
            const locked = isTimeLocked(lesson.unlockAt);

            const cardBody = (
              <>
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${locked ? "bg-gray-100" : ""}`}
                  style={locked ? undefined : { backgroundColor: tokens.bg }}
                >
                  {locked ? (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      style={{ color: tokens.icon }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Breadcrumb {...lesson.breadcrumb} />
                  <h3 className={`font-semibold text-sm leading-snug line-clamp-3 mt-0.5 ${locked ? "text-gray-400" : "text-[#2D1B69]"}`}>
                    {lesson.title}
                  </h3>
                  {locked && lesson.unlockAt && (
                    <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                      </svg>
                      Unlocks {formatUnlockAt(lesson.unlockAt)}
                    </p>
                  )}
                </div>
              </>
            );

            if (locked) {
              return (
                <div
                  key={lesson.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 opacity-70 cursor-not-allowed"
                  style={{ borderLeftColor: "#e5e7eb", borderLeftWidth: 3 }}
                >
                  {cardBody}
                </div>
              );
            }

            return (
              <Link
                key={lesson.id}
                href={`/learn/lessons/${lesson.id}`}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-start gap-3"
                style={{ borderLeftColor: tokens.border, borderLeftWidth: 3 }}
              >
                {cardBody}
              </Link>
            );
          })}
        </div>
      )}
    </LearnPageShell>
  );
}

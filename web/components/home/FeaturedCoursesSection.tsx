import Link from "next/link";
import { getFeaturedCards, type FeaturedCard } from "@/lib/featuredCardsDb";
import CourseCarousel from "@/components/home/CourseCarousel";

export default async function FeaturedCoursesSection() {
  const cards: FeaturedCard[] = await getFeaturedCards();

  const freeCards = cards.filter((c) => c.isFree);
  const paidCards = cards.filter((c) => !c.isFree);

  const hasAny = freeCards.length > 0 || paidCards.length > 0;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-2">
              Featured Courses
            </h2>
            <p className="text-gray-500">
              Hand-picked preparation bundles for top competitive exams.
            </p>
          </div>
          <Link
            href="/courses"
            className="shrink-0 ml-4 bg-white border-2 border-[#8050C0] text-[#8050C0] hover:bg-[#F6F2FF] hover:text-[#6D3DB0] text-sm font-semibold px-4 py-2 rounded-xl transition-colors duration-150"
          >
            Browse All Courses
          </Link>
        </div>

        {!hasAny ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
            <p className="text-gray-400 text-sm">
              New courses being added soon. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Free courses carousel */}
            {freeCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Free Courses
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <CourseCarousel cards={freeCards} />
              </div>
            )}

            {/* Paid courses carousel */}
            {paidCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-purple-100 text-[#6D4BCB] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Premium Courses
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <CourseCarousel cards={paidCards} />
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Login required to access course content.{" "}
          <Link
            href="/register"
            className="text-[#6D4BCB] hover:underline font-medium"
          >
            Create a free account →
          </Link>
        </p>
      </div>
    </section>
  );
}

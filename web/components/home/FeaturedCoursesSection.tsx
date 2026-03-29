import Link from "next/link";
import Image from "next/image";
import { getFeaturedCards, type FeaturedCard } from "@/lib/featuredCardsDb";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function CourseGrid({ cards }: { cards: FeaturedCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div
          key={card.id}
          className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col"
        >
          {card.thumbnailUrl ? (
            <div className="relative h-32 overflow-hidden">
              <Image
                src={card.thumbnailUrl}
                alt={card.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 px-3 pb-2 flex flex-col items-start gap-1">
                {card.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {card.badge}
                  </span>
                )}
                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow">
                  {card.title}
                </h3>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] h-32 flex flex-col items-center justify-center px-5 gap-2">
              {card.badge && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                  {card.badge}
                </span>
              )}
              <h3 className="text-white font-bold text-sm text-center leading-snug line-clamp-3">
                {card.title}
              </h3>
            </div>
          )}

          <div className="p-4 flex flex-col flex-1">
            {card.categoryName && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                {card.categoryName}
              </span>
            )}
            {card.description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">
                {card.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-auto gap-3">
              <div className="min-w-0">
                {card.isFree ? (
                  <span className="text-lg font-bold text-[#2D1B69]">Free</span>
                ) : card.price !== null ? (
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-lg font-bold text-[#2D1B69]">
                      {formatPrice(card.price)}
                    </span>
                    {card.originalPrice !== null && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(card.originalPrice)}
                      </span>
                    )}
                    {card.discountPercent != null && card.discountPercent > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        {card.discountPercent}% off
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              <Link
                href={card.ctaHref}
                className="text-xs font-semibold bg-[#6D4BCB] text-white px-3 py-1.5 rounded-full hover:bg-[#5E3FB8] transition-colors shrink-0"
              >
                {card.cta}
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
                <CourseGrid cards={freeCards} />
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
                <CourseGrid cards={paidCards} />
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

import Link from "next/link";
import Image from "next/image";
import { getFeaturedCards, type FeaturedCard } from "@/lib/featuredCardsDb";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function FeaturedCoursesSection() {
  // DB query + caching is fully handled in lib/featuredCardsDb.ts.
  // Keeping data fetching out of this file prevents Turbopack from using the
  // entire component source as the unstable_cache key (which causes a >2 MB
  // cache entry that Next.js silently refuses to store).
  const cards: FeaturedCard[] = await getFeaturedCards();

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
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

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
            <p className="text-gray-400 text-sm">
              New courses being added soon. Check back shortly.
            </p>
          </div>
        ) : (
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
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
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

import Link from "next/link";
import { prisma } from "@/lib/db";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function FeaturedCoursesSection() {
  // Wrapped in try/catch so a DB failure at runtime returns an empty state
  // instead of crashing the page render.  The same guard also protects the
  // build: with `dynamic = "force-dynamic"` on app/page.tsx this component is
  // never executed at build time, but the try/catch is kept as an extra layer
  // of defence.
  let rawSeries: {
    id: string;
    title: string;
    description: string | null;
    pricePaise: number;
    discountPaise: number;
    categoryId: string | null;
  }[] = [];

  let catMap = new Map<string, string>();

  try {
    const [series, categories] = await Promise.all([
      prisma.testSeries.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          description: true,
          pricePaise: true,
          discountPaise: true,
          categoryId: true,
        },
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);

    rawSeries = series;
    catMap = new Map(categories.map((c) => [c.id, c.name]));
  } catch (err) {
    // Log clearly so the failing query is visible in Vercel / server logs.
    console.error("[FeaturedCoursesSection] Prisma query failed — rendering empty state.", err);
    // rawSeries stays [] → the empty-state UI is rendered below.
  }

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
            href="/testhub"
            className="shrink-0 ml-4 bg-white border-2 border-[#8050C0] text-[#8050C0] hover:bg-[#F6F2FF] hover:text-[#6D3DB0] text-sm font-semibold px-4 py-2 rounded-xl transition-colors duration-150"
          >
            Browse All Tests
          </Link>
        </div>

        {rawSeries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
            <p className="text-gray-400 text-sm">
              New courses being added soon. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rawSeries.map((s) => {
              const catName = s.categoryId
                ? (catMap.get(s.categoryId) ?? null)
                : null;
              const price = s.pricePaise;
              const originalPrice =
                s.discountPaise > 0 ? price + s.discountPaise : undefined;
              const isFree = price === 0;

              return (
                <div
                  key={s.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col"
                >
                  <div className="bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] h-32 flex items-center justify-center px-5">
                    <h3 className="text-white font-bold text-sm text-center leading-snug line-clamp-3">
                      {s.title}
                    </h3>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    {catName && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                        {catName}
                      </span>
                    )}
                    {s.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">
                        {s.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-lg font-bold text-[#2D1B69]">
                          {isFree ? "Free" : formatPrice(price)}
                        </span>
                        {originalPrice !== undefined && (
                          <span className="text-xs text-gray-400 line-through ml-1.5">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/testhub"
                        className="text-xs font-semibold bg-[#6D4BCB] text-white px-3 py-1.5 rounded-full hover:bg-[#5E3FB8] transition-colors"
                      >
                        {isFree ? "Start Free" : "View Tests"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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

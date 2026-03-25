import Link from "next/link";
import { prisma } from "@/lib/db";

const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
  FREE_DEMO: "Free Demo",
  STANDARD: "Standard",
  PACKAGE: "Package",
  COMPLETE_PREP_PACK: "Complete Prep",
  VIDEO_ONLY: "Video Course",
  SELF_PREP: "Self Prep",
  PDF_ONLY: "PDF Course",
  TEST_SERIES: "Test Series",
  FLASHCARDS_ONLY: "Flashcards",
  CURRENT_AFFAIRS: "Current Affairs",
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

type UnifiedCard = {
  id: string;
  title: string;
  description: string | null;
  categoryName: string | null;
  isFree: boolean;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  badge: string | null;
  href: string;
  ctaHref: string;
  cta: string;
};

export default async function FeaturedCoursesSection() {
  const cards: UnifiedCard[] = [];

  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    // 1. Featured Courses from the Course table (admin-owned — raw SQL read-only)
    type RawCourse = {
      id: string;
      name: string;
      description: string | null;
      productCategory: string;
      categoryId: string | null;
      isFree: boolean;
      mrpPaise: number | null;
      sellingPricePaise: number | null;
      packageId: string | null;
    };
    const featuredCourses = await prisma.$queryRaw<RawCourse[]>`
      SELECT
        c.id, c.name, c.description, c."productCategory", c."categoryId",
        COALESCE(c."isFree", false) AS "isFree",
        c."mrpPaise",
        c."sellingPricePaise",
        pkg.id AS "packageId"
      FROM "Course" c
      LEFT JOIN LATERAL (
        SELECT id FROM "ProductPackage"
        WHERE "isActive" = true
          AND "entitlementCodes" @> ARRAY[c."productCategory"]::text[]
        ORDER BY "pricePaise" ASC
        LIMIT 1
      ) pkg ON true
      WHERE c.featured = true AND c."isActive" = true
      ORDER BY c."createdAt" DESC
      LIMIT 4
    `;

    for (const c of featuredCourses) {
      const isFreeCourse = c.isFree || c.productCategory === "FREE_DEMO";
      const selling = c.sellingPricePaise;
      const mrp = c.mrpPaise;
      const hasPricing = !isFreeCourse && selling != null && selling > 0;
      const discount =
        hasPricing && mrp != null && mrp > selling!
          ? Math.round(((mrp - selling!) / mrp) * 100)
          : null;
      const ctaHref = hasPricing && c.packageId
        ? `/checkout?packageId=${c.packageId}`
        : `/courses/${c.id}`;
      cards.push({
        id: `course-${c.id}`,
        title: c.name,
        description: c.description,
        categoryName: c.categoryId ? (catMap.get(c.categoryId) ?? null) : null,
        isFree: isFreeCourse,
        price: hasPricing ? selling! : null,
        originalPrice: hasPricing && mrp != null && mrp > selling! ? mrp : null,
        discountPercent: discount,
        badge: PRODUCT_CATEGORY_LABEL[c.productCategory] ?? c.productCategory,
        href: `/courses/${c.id}`,
        ctaHref: ctaHref,
        cta: isFreeCourse ? "Start Free" : hasPricing ? "Buy Now" : "View Course",
      });
    }

    // 2. Fill remaining slots (up to 4 total) with published TestSeries
    const remaining = 4 - cards.length;
    if (remaining > 0) {
      const series = await prisma.testSeries.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: remaining,
        select: {
          id: true,
          title: true,
          description: true,
          pricePaise: true,
          discountPaise: true,
          categoryId: true,
        },
      });

      for (const s of series) {
        const isFree = s.pricePaise === 0;
        cards.push({
          id: `series-${s.id}`,
          title: s.title,
          description: s.description,
          categoryName: s.categoryId ? (catMap.get(s.categoryId) ?? null) : null,
          isFree,
          price: s.pricePaise,
          originalPrice: s.discountPaise > 0 ? s.pricePaise + s.discountPaise : null,
          discountPercent: s.discountPaise > 0
            ? Math.round((s.discountPaise / (s.pricePaise + s.discountPaise)) * 100)
            : null,
          badge: null,
          href: "/testhub",
          ctaHref: "/testhub",
          cta: isFree ? "Start Free" : "View Tests",
        });
      }
    }
  } catch (err) {
    console.error("[FeaturedCoursesSection] Query failed — rendering empty state.", err);
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

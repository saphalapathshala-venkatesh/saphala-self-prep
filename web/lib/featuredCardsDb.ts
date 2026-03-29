/**
 * Featured cards data — in-memory TTL cache.
 *
 * unstable_cache stores its ENTIRE entry (including Turbopack-inlined module
 * code) as the cache payload, which in Turbopack dev mode easily exceeds
 * Next.js's 2 MB per-entry hard limit and is silently dropped on every request.
 *
 * A plain module-level Map with a TTL has no size limit, works identically in
 * dev (long-running process) and production (warm serverless container), and is
 * the correct tool when unstable_cache is broken by large payload sizes.
 */

import { prisma } from "@/lib/db";

export const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
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

export type FeaturedCard = {
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
  thumbnailUrl: string | null;
};

type RawCourse = {
  id: string;
  name: string;
  description: string | null;
  productCategory: string;
  categoryId: string | null;
  isFree: boolean;
  mrp: number | null;
  sellingPrice: number | null;
  packageId: string | null;
  thumbnailUrl: string | null;
};

// Module-level in-memory cache — persists across requests in the same process.
let _cache: { data: FeaturedCard[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

async function _fetchFeaturedCards(): Promise<FeaturedCard[]> {
  const cards: FeaturedCard[] = [];

  const [categories, featuredCourses] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.$queryRaw<RawCourse[]>`
      SELECT
        c.id, c.name, c.description, c."productCategory", c."categoryId",
        COALESCE(c."isFree", false) AS "isFree",
        c.mrp,
        c."sellingPrice",
        c."thumbnailUrl",
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
      LIMIT 8
    `,
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  for (const c of featuredCourses) {
    const isFreeCourse = c.isFree || c.productCategory === "FREE_DEMO";
    const sellingRupees = c.sellingPrice;
    const mrpRupees = c.mrp;
    const hasPricing = !isFreeCourse && sellingRupees != null && sellingRupees > 0;
    const sellingPaise = hasPricing ? Math.round(sellingRupees! * 100) : null;
    const mrpPaise =
      hasPricing && mrpRupees != null && mrpRupees > sellingRupees!
        ? Math.round(mrpRupees * 100)
        : null;
    const discount =
      hasPricing && mrpRupees != null && mrpRupees > sellingRupees!
        ? Math.round(((mrpRupees - sellingRupees!) / mrpRupees) * 100)
        : null;
    const ctaHref =
      hasPricing && c.packageId
        ? `/checkout?packageId=${c.packageId}&courseId=${c.id}`
        : `/courses/${c.id}`;
    cards.push({
      id: `course-${c.id}`,
      title: c.name,
      description: c.description,
      categoryName: c.categoryId ? (catMap.get(c.categoryId) ?? null) : null,
      isFree: isFreeCourse,
      price: sellingPaise,
      originalPrice: mrpPaise,
      discountPercent: discount,
      badge: PRODUCT_CATEGORY_LABEL[c.productCategory] ?? c.productCategory,
      href: `/courses/${c.id}`,
      ctaHref,
      cta: isFreeCourse ? "Start Free" : hasPricing ? "Buy Now" : "View Course",
      thumbnailUrl: c.thumbnailUrl ?? null,
    });
  }

  const remaining = 8 - cards.length;
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
        discountPercent:
          s.discountPaise > 0
            ? Math.round((s.discountPaise / (s.pricePaise + s.discountPaise)) * 100)
            : null,
        badge: null,
        href: "/testhub",
        ctaHref: "/testhub",
        cta: isFree ? "Start Free" : "View Tests",
        thumbnailUrl: null,
      });
    }
  }

  return cards;
}

/**
 * Fetches featured cards with a 60-second in-memory TTL cache.
 * Returns [] on DB error and caches that empty state for the TTL so Neon is
 * not re-queried on every request when the quota is exceeded.
 */
export async function getFeaturedCards(): Promise<FeaturedCard[]> {
  const now = Date.now();
  if (_cache && now < _cache.expiresAt) {
    return _cache.data;
  }
  try {
    const data = await _fetchFeaturedCards();
    _cache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  } catch (err) {
    console.error(
      "[featuredCardsDb] DB query failed, caching empty state for 60s:",
      (err as Error).message,
    );
    _cache = { data: [], expiresAt: now + CACHE_TTL_MS };
    return [];
  }
}

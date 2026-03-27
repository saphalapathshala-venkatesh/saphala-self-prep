import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCategoryImage } from "@/config/categoryImages";
import { unstable_cache } from "next/cache";

export const revalidate = 120;

// Named function — keeps the unstable_cache key small.
// Inline lambdas cause Turbopack to serialise the full function body as the
// cache key, which can exceed Next.js's 2 MB per-entry limit.
async function _fetchCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return categories.map((cat) => ({
      ...cat,
      thumbnailUrl: getCategoryImage(cat.id),
    }));
  } catch (err) {
    console.error("[categories] DB query failed, caching empty state:", (err as Error).message);
    return [] as { id: string; name: string; thumbnailUrl: string | null }[];
  }
}

const getCategories = unstable_cache(
  _fetchCategories,
  ["public-categories"],
  { revalidate: 120, tags: ["categories"] },
);

export async function GET() {
  const enriched = await getCategories();
  return NextResponse.json(enriched);
}

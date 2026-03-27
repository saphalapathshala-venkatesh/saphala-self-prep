import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCategoryImage } from "@/config/categoryImages";
import { unstable_cache } from "next/cache";

export const revalidate = 120;

const getCategories = unstable_cache(
  async () => {
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
      // Cache empty state so we don't hammer Neon on every request when quota is exceeded.
      console.error("[categories] DB query failed, caching empty state:", (err as Error).message);
      return [];
    }
  },
  ["public-categories"],
  { revalidate: 120, tags: ["categories"] },
);

export async function GET() {
  const enriched = await getCategories();
  return NextResponse.json(enriched);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCategoryImage } from "@/config/categoryImages";
import { unstable_cache } from "next/cache";

export const revalidate = 120;

const getCategories = unstable_cache(
  async () => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return categories.map((cat) => ({
      ...cat,
      thumbnailUrl: getCategoryImage(cat.id),
    }));
  },
  ["public-categories"],
  { revalidate: 120, tags: ["categories"] },
);

export async function GET() {
  try {
    const enriched = await getCategories();
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

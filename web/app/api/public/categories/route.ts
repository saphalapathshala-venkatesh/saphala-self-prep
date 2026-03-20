import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCategoryImage } from "@/config/categoryImages";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    const enriched = categories.map((cat) => ({
      ...cat,
      thumbnailUrl: getCategoryImage(cat.id),
    }));
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

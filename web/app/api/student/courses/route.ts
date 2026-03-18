import { NextRequest, NextResponse } from "next/server";
import { getActiveCourses } from "@/lib/courseDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const productCategory = searchParams.get("productCategory") ?? undefined;
    const featuredParam = searchParams.get("featured");
    const featured = featuredParam === "true" ? true : undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 100) : 50;

    const courses = await getActiveCourses({ categoryId, productCategory, featured, limit });
    return NextResponse.json({ courses });
  } catch (err) {
    console.error("[GET /api/student/courses]", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getExamsForCategory } from "@/lib/courseDb";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }
  try {
    const exams = await getExamsForCategory(categoryId);
    return NextResponse.json(exams, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load exams" }, { status: 500 });
  }
}

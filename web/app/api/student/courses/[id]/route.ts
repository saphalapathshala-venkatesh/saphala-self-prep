import { NextRequest, NextResponse } from "next/server";
import { getCourseWithCurriculum } from "@/lib/courseDb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getCourseWithCurriculum(id);
    if (!data) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/student/courses/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

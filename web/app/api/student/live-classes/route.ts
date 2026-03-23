import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLiveClassesForStudent } from "@/lib/liveClassDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId   = searchParams.get("courseId")   ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit      = limitParam ? Math.min(Number(limitParam), 100) : 50;

    const classes = await getLiveClassesForStudent({ userId: user.id, courseId, categoryId, limit });

    // Strip join credentials unless canJoin is true AND student is entitled
    const safe = classes.map(({ joinUrl, zoomPassword, sessionCode, ...rest }) => ({
      ...rest,
      joinUrl:      rest.canJoin && rest.isEntitled ? joinUrl      : null,
      sessionCode:  rest.canJoin && rest.isEntitled ? sessionCode  : null,
      zoomPassword: rest.canJoin && rest.isEntitled ? zoomPassword : null,
    }));

    return NextResponse.json(safe);
  } catch (err) {
    console.error("[GET /api/student/live-classes]", err);
    return NextResponse.json({ error: "Failed to fetch live classes" }, { status: 500 });
  }
}

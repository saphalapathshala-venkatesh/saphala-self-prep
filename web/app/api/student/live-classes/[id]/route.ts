import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLiveClassById } from "@/lib/liveClassDb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const cls = await getLiveClassById(id);
    if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Strip join creds unless canJoin is true
    const { joinUrl, zoomPassword, sessionCode, ...rest } = cls;
    return NextResponse.json({
      ...rest,
      joinUrl:      cls.canJoin ? joinUrl      : null,
      sessionCode:  cls.canJoin ? sessionCode  : null,
      zoomPassword: cls.canJoin ? zoomPassword : null,
    });
  } catch (err) {
    console.error("[GET /api/student/live-classes/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch live class" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVideoById } from "@/lib/videoDb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const video = await getVideoById(id, user.id);
    if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { hlsUrl, playbackUrl, providerVideoId, ...rest } = video;
    return NextResponse.json({
      ...rest,
      hlsUrl:          video.isEntitled ? hlsUrl          : null,
      playbackUrl:     video.isEntitled ? playbackUrl      : null,
      providerVideoId: video.isEntitled || video.allowPreview ? providerVideoId : null,
    });
  } catch (err) {
    console.error("[GET /api/student/videos/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 });
  }
}

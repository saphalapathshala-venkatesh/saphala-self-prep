import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVideosForStudent } from "@/lib/videoDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId   = searchParams.get("courseId")   ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit      = limitParam ? Math.min(Number(limitParam), 100) : 60;

    const videos = await getVideosForStudent({ userId: user.id, courseId, categoryId, limit });

    // Strip playback URLs for non-entitled, non-preview videos
    const safe = videos.map(({ hlsUrl, playbackUrl, providerVideoId, ...rest }) => ({
      ...rest,
      hlsUrl:         rest.isEntitled ? hlsUrl         : null,
      playbackUrl:    rest.isEntitled ? playbackUrl     : null,
      providerVideoId: rest.isEntitled || rest.allowPreview ? providerVideoId : null,
    }));

    return NextResponse.json(safe);
  } catch (err) {
    console.error("[GET /api/student/videos]", err);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

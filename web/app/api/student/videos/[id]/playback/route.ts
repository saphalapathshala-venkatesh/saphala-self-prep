/**
 * GET /api/student/videos/:id/playback
 *
 * Protected playback endpoint.  The client (CourseVideoPlayer) calls this
 * on mount — keeping signed/raw Bunny URLs out of the SSR HTML.
 *
 * Access rules (all must pass):
 *   1. Valid student session
 *   2. Video status = PUBLISHED
 *   3. No unlockAt in the future (unless student is entitled)
 *   4. Student is entitled  OR  video.allowPreview = true
 *
 * Response: { manifestUrl, posterUrl, provider, providerVideoId, title }
 *   • manifestUrl  — signed Bunny URL (when BUNNY_SECURITY_KEY is set)
 *                    or raw HLS URL (token auth disabled)
 *                    or null if no playable source exists yet
 *   • providerVideoId — only returned for YOUTUBE provider (used by player)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVideoById } from "@/lib/videoDb";
import { resolveManifestUrl } from "@/lib/video/bunnyPlayback";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch video with entitlement check ──────────────────────────────────────
  const { id } = await params;
  const video   = await getVideoById(id, user.id);
  // getVideoById already filters to PUBLISHED-only; 404 covers not-found + unpublished
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // ── Access gate ─────────────────────────────────────────────────────────────
  // Deny if neither entitled nor preview-allowed
  if (!video.isEntitled && !video.allowPreview) {
    return NextResponse.json(
      { error: "Enrollment required to watch this video" },
      { status: 403 },
    );
  }

  // ── Resolve playback URL ────────────────────────────────────────────────────
  // YouTube: no manifest URL — player uses providerVideoId directly.
  // Bunny / other HLS: resolve + conditionally sign.
  const isYoutube   = video.provider === "YOUTUBE";
  const manifestUrl = isYoutube
    ? null
    : resolveManifestUrl({
        provider:    video.provider,
        hlsUrl:      video.hlsUrl,
        playbackUrl: video.playbackUrl,
      });

  return NextResponse.json({
    manifestUrl,
    posterUrl:       video.thumbnailUrl,
    provider:        video.provider,
    // providerVideoId only exposed for YouTube — never reveal raw Bunny GUIDs
    providerVideoId: isYoutube ? video.providerVideoId : null,
    title:           video.title,
  });
}

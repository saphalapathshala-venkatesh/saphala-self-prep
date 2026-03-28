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
 * Response: { manifestUrl, embedUrl, posterUrl, provider, providerVideoId, title }
 *   • manifestUrl  — signed Bunny HLS URL (when hlsUrl stored + BUNNY_SECURITY_KEY set),
 *                    raw HLS URL (token auth disabled), or null when using embed path
 *   • embedUrl     — Bunny iframe embed URL (when provider=BUNNY, no HLS URL, and
 *                    BUNNY_LIBRARY_ID is configured), otherwise null.
 *                    Also set when provider=YOUTUBE (YouTube embed URL).
 *   • providerVideoId — only returned for YOUTUBE and BUNNY providers
 *
 * Player rendering rules (enforced in CourseVideoPlayer):
 *   manifestUrl != null → HLS.js / native <video>
 *   embedUrl    != null → <iframe> (Bunny embed or YouTube)
 *   both null           → "video unavailable" state
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVideoById } from "@/lib/videoDb";
import { resolveManifestUrl, buildBunnyEmbedUrl } from "@/lib/video/bunnyPlayback";

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
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // ── Access gate ─────────────────────────────────────────────────────────────
  if (!video.isEntitled && !video.allowPreview) {
    return NextResponse.json(
      { error: "Enrollment required to watch this video" },
      { status: 403 },
    );
  }

  // ── Resolve playback source ─────────────────────────────────────────────────
  const isBunny   = video.provider === "BUNNY";
  const isYoutube = video.provider === "YOUTUBE";

  let manifestUrl: string | null = null;
  let embedUrl: string | null    = null;

  if (isYoutube) {
    // YouTube — player uses providerVideoId directly to build the embed URL
    embedUrl = video.providerVideoId
      ? `https://www.youtube.com/embed/${video.providerVideoId}?rel=0&modestbranding=1&enablejsapi=1`
      : null;
  } else {
    // Bunny or generic HLS — try HLS manifest first
    manifestUrl = resolveManifestUrl({
      provider:    video.provider,
      hlsUrl:      video.hlsUrl,
      playbackUrl: video.playbackUrl,
    });

    // If no HLS URL and this is a Bunny video with a providerVideoId,
    // fall back to the Bunny Stream embed player (iframe).
    // Requires BUNNY_LIBRARY_ID env var.
    if (!manifestUrl && isBunny) {
      embedUrl = buildBunnyEmbedUrl(video.providerVideoId ?? null);
    }
  }

  return NextResponse.json({
    manifestUrl,
    embedUrl,
    posterUrl:       video.thumbnailUrl,
    provider:        video.provider,
    // Expose providerVideoId for YouTube and Bunny so the player can use it
    providerVideoId: (isYoutube || isBunny) ? video.providerVideoId : null,
    title:           video.title,
  });
}

/**
 * Bunny Stream playback URL helper — server-side only.
 *
 * Bunny Stream videos always use the iframe embed player at
 * iframe.mediadelivery.net. The embed player supports a full postMessage API:
 *   - Parent sends { action: 'subscribe' } after iframe load to start events
 *   - Player sends timeupdate, ended, playerReady, play, pause events
 *   - Parent sends { action: 'seek', currentTime: N } for skip controls
 * This is handled in CourseVideoPlayer.tsx (Bunny iframe path).
 *
 * NON-Bunny HLS sources (e.g. external m3u8 stored in hlsUrl or playbackUrl)
 * are still served directly and signed when BUNNY_SECURITY_KEY is set.
 *
 * Token auth spec (no-IP variant) for external HLS:
 *   token   = Base64URL( SHA256( SecurityKey + videoPath + expires ) )
 *   signed  = {originUrl}?token={token}&expires={expires}
 * Reference: https://support.bunny.net/hc/en-us/articles/360016055099
 */

import { createHash } from "crypto";

const BUNNY_SECURITY_KEY     = process.env.BUNNY_SECURITY_KEY ?? "";
const BUNNY_LIBRARY_ID       = process.env.BUNNY_LIBRARY_ID   ?? "";
const DEFAULT_EXPIRY_SECONDS = 3600;

/**
 * Returns a signed HLS URL. If BUNNY_SECURITY_KEY is not configured
 * the original URL is returned unchanged (token auth not active).
 */
export function signBunnyUrl(
  hlsUrl: string,
  expirySeconds = DEFAULT_EXPIRY_SECONDS,
): string {
  if (!BUNNY_SECURITY_KEY) {
    return hlsUrl;
  }

  try {
    const url       = new URL(hlsUrl);
    const videoPath = url.pathname;
    const expires   = Math.floor(Date.now() / 1000) + expirySeconds;

    const token = createHash("sha256")
      .update(BUNNY_SECURITY_KEY + videoPath + String(expires))
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    url.searchParams.set("token",   token);
    url.searchParams.set("expires", String(expires));

    return url.toString();
  } catch {
    return hlsUrl;
  }
}

/**
 * Resolves the best manifest URL from a video row.
 *
 * For Bunny Stream videos this always returns null — they use the iframe
 * embed player (buildBunnyEmbedUrl) rather than direct HLS delivery.
 * Bunny's CDN does not allow cross-origin HLS requests from custom domains.
 *
 * Priority for non-Bunny sources:
 *   1. hlsUrl (explicit, stored in DB)
 *   2. playbackUrl
 *   3. null
 */
export function resolveManifestUrl(opts: {
  provider: string;
  hlsUrl: string | null;
  playbackUrl: string | null;
  providerVideoId?: string | null;
}): string | null {
  const { provider, hlsUrl, playbackUrl } = opts;

  // Bunny Stream videos must use the embed player — return null so the
  // playback route falls through to buildBunnyEmbedUrl.
  if (provider === "BUNNY") {
    console.log("VIDEO_SOURCE: BUNNY — using iframe embed player");
    return null;
  }

  if (hlsUrl) {
    console.log("VIDEO_SOURCE:", hlsUrl);
    return hlsUrl;
  }
  if (playbackUrl) {
    console.log("VIDEO_SOURCE:", playbackUrl);
    return playbackUrl;
  }

  console.log("VIDEO_SOURCE: null — no playable source found");
  return null;
}

/**
 * Builds a Bunny Stream iframe embed URL.
 * This is the primary (and only) playback path for Bunny Stream videos.
 * The embed player supports full postMessage control and event subscription.
 *
 * Returns null if BUNNY_LIBRARY_ID is not configured or providerVideoId is empty.
 */
export function buildBunnyEmbedUrl(providerVideoId: string | null): string | null {
  if (!BUNNY_LIBRARY_ID || !providerVideoId) return null;
  // enablePostMessage=true is REQUIRED — without it Bunny silently ignores
  // all { action: 'subscribe' } messages and sends no events back.
  return (
    `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${providerVideoId}` +
    `?autoplay=false&loop=false&muted=false&preload=true&responsive=true&enablePostMessage=true`
  );
}

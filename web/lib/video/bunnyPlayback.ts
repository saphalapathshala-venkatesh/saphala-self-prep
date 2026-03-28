/**
 * Bunny Stream playback URL helper — server-side only.
 *
 * HLS URL format for Bunny Stream:
 *   https://vz-{BUNNY_LIBRARY_ID}.b-cdn.net/{videoId}/playlist.m3u8
 *
 * All Bunny videos with a providerVideoId always use native HLS playback
 * (never the iframe embed). This enables skip controls, DOM-event XP
 * completion detection, and the quality selector.
 *
 * When BUNNY_SECURITY_KEY is set, the HLS URL is signed with a short-lived
 * token so the CDN rejects requests from unauthorised clients.
 *
 * Bunny token auth spec (no-IP variant):
 *   token   = Base64URL( SHA256( SecurityKey + videoPath + expires ) )
 *   signed  = {originUrl}?token={token}&expires={expires}
 *
 * Reference: https://support.bunny.net/hc/en-us/articles/360016055099
 */

import { createHash } from "crypto";

const BUNNY_SECURITY_KEY     = process.env.BUNNY_SECURITY_KEY ?? "";
const BUNNY_LIBRARY_ID       = process.env.BUNNY_LIBRARY_ID   ?? "";
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Returns a signed Bunny HLS URL. If BUNNY_SECURITY_KEY is not configured
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
    const videoPath = url.pathname; // e.g. "/abc-guid/playlist.m3u8"
    const expires   = Math.floor(Date.now() / 1000) + expirySeconds;

    // token = Base64URL( SHA256( key + path + expires ) )
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
 * Priority:
 *   1. hlsUrl (explicitly stored in DB) — signed if Bunny + key is set
 *   2. Bunny Stream auto-constructed HLS URL:
 *        https://vz-{BUNNY_LIBRARY_ID}.b-cdn.net/{providerVideoId}/playlist.m3u8
 *      — used for any Bunny video with providerVideoId, regardless of whether
 *        hlsUrl is stored. This ensures all Bunny videos use native HLS playback
 *        (skip controls, reliable XP, quality selector) instead of iframe embed.
 *   3. playbackUrl — returned as-is
 *   4. null — no playable source found
 */
export function resolveManifestUrl(opts: {
  provider: string;
  hlsUrl: string | null;
  playbackUrl: string | null;
  providerVideoId?: string | null;
}): string | null {
  const { provider, hlsUrl, playbackUrl, providerVideoId } = opts;

  if (hlsUrl) {
    const resolved = provider === "BUNNY" ? signBunnyUrl(hlsUrl) : hlsUrl;
    console.log("VIDEO_SOURCE:", resolved);
    return resolved;
  }

  // Bunny Stream: auto-construct HLS URL from library ID + video ID.
  // Format: https://vz-{libraryId}.b-cdn.net/{videoId}/playlist.m3u8
  if (provider === "BUNNY" && providerVideoId && BUNNY_LIBRARY_ID) {
    const bunnyHls = `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net/${providerVideoId}/playlist.m3u8`;
    const resolved = signBunnyUrl(bunnyHls);
    console.log("VIDEO_SOURCE:", resolved);
    return resolved;
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
 *
 * This is now only used as a last-resort fallback when BUNNY_LIBRARY_ID
 * is not set (i.e. resolveManifestUrl cannot auto-construct the HLS URL).
 * Under normal operation with BUNNY_LIBRARY_ID configured, Bunny videos
 * will always use native HLS and this function will not be called.
 */
export function buildBunnyEmbedUrl(providerVideoId: string | null): string | null {
  if (!BUNNY_LIBRARY_ID || !providerVideoId) return null;
  return (
    `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${providerVideoId}` +
    `?autoplay=false&loop=false&muted=false&preload=true&responsive=true`
  );
}

/**
 * Bunny Stream playback URL helper — server-side only.
 *
 * When BUNNY_SECURITY_KEY is set, signs the HLS URL with a short-lived token
 * so the CDN rejects requests from anyone who didn't go through our API.
 * When it is NOT set (dev / token-auth disabled), the URL is returned as-is.
 *
 * Bunny token auth spec (no-IP variant):
 *   token   = Base64URL( SHA256( SecurityKey + videoPath + expires ) )
 *   signed  = {originUrl}?token={token}&expires={expires}
 *
 * Reference: https://support.bunny.net/hc/en-us/articles/360016055099
 *
 * To enable token auth in production:
 *   1. Enable "Token Authentication" in your Bunny CDN pull zone settings.
 *   2. Add BUNNY_SECURITY_KEY to Replit secrets.
 */

import { createHash } from "crypto";

const BUNNY_SECURITY_KEY     = process.env.BUNNY_SECURITY_KEY ?? "";
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
    // Malformed URL — return unsigned rather than crashing
    return hlsUrl;
  }
}

/**
 * Resolves the best manifest URL from a video row.
 *
 * Priority:
 *   1. hlsUrl (Bunny or other HLS) — signed if Bunny + key is set
 *   2. playbackUrl  — returned as-is
 *   3. null         — no playable source
 */
export function resolveManifestUrl(opts: {
  provider: string;
  hlsUrl: string | null;
  playbackUrl: string | null;
}): string | null {
  const { provider, hlsUrl, playbackUrl } = opts;

  if (hlsUrl) {
    return provider === "BUNNY" ? signBunnyUrl(hlsUrl) : hlsUrl;
  }
  if (playbackUrl) {
    return playbackUrl;
  }
  return null;
}

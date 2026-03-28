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
 *   2. Add BUNNY_SECURITY_KEY to Vercel environment variables.
 *
 * HLS auto-construction (avoids iframe embed fallback):
 *   Set BUNNY_CDN_HOSTNAME to the CDN hostname for your Bunny Stream library.
 *   Find it in: Bunny Dashboard → Stream → Library → CDN Hostname
 *   Example: vz-abc12345.b-cdn.net
 *   When set, Bunny videos without a stored hlsUrl will automatically use
 *   HLS playback (skip controls, reliable XP) instead of the iframe embed.
 */

import { createHash } from "crypto";

const BUNNY_SECURITY_KEY     = process.env.BUNNY_SECURITY_KEY  ?? "";
const BUNNY_LIBRARY_ID       = process.env.BUNNY_LIBRARY_ID    ?? "";
const BUNNY_CDN_HOSTNAME     = process.env.BUNNY_CDN_HOSTNAME  ?? "";
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
 *   1. hlsUrl (explicit, stored in DB) — signed if Bunny + key is set
 *   2. Auto-constructed Bunny HLS URL from BUNNY_CDN_HOSTNAME + providerVideoId
 *      — only when provider=BUNNY and BUNNY_CDN_HOSTNAME is configured.
 *      This avoids the iframe-embed fallback and enables native HLS playback
 *      (skip controls, DOM-event XP, quality selector).
 *   3. playbackUrl — returned as-is
 *   4. null — no playable HLS source; caller will try embed fallback
 */
export function resolveManifestUrl(opts: {
  provider: string;
  hlsUrl: string | null;
  playbackUrl: string | null;
  providerVideoId?: string | null;
}): string | null {
  const { provider, hlsUrl, playbackUrl, providerVideoId } = opts;

  if (hlsUrl) {
    return provider === "BUNNY" ? signBunnyUrl(hlsUrl) : hlsUrl;
  }

  // Auto-construct Bunny HLS URL when BUNNY_CDN_HOSTNAME is configured.
  // This converts videos stored with only a providerVideoId from iframe embed
  // to native HLS — enabling skip controls and reliable XP completion events.
  if (provider === "BUNNY" && providerVideoId && BUNNY_CDN_HOSTNAME) {
    const autoHlsUrl = `https://${BUNNY_CDN_HOSTNAME}/${providerVideoId}/playlist.m3u8`;
    return signBunnyUrl(autoHlsUrl);
  }

  if (playbackUrl) {
    return playbackUrl;
  }
  return null;
}

/**
 * Builds a Bunny Stream iframe embed URL for a given video ID.
 *
 * Used only as a final fallback when no HLS source is available
 * (i.e. hlsUrl is null AND BUNNY_CDN_HOSTNAME is not configured).
 *
 * Requires BUNNY_LIBRARY_ID to be set in environment variables.
 * Returns null if BUNNY_LIBRARY_ID is not configured or providerVideoId is empty.
 */
export function buildBunnyEmbedUrl(providerVideoId: string | null): string | null {
  if (!BUNNY_LIBRARY_ID || !providerVideoId) return null;
  return (
    `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${providerVideoId}` +
    `?autoplay=false&loop=false&muted=false&preload=true&responsive=true`
  );
}

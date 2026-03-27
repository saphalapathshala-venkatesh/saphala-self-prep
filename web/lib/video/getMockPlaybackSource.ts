/**
 * Temporary mock playback source — frontend-only development phase.
 *
 * Replace this entire helper with a real API call once Bunny Stream backend
 * integration is ready:
 *
 *   const res  = await fetch(`/api/videos/${videoId}/playback`);
 *   const data = await res.json() as PlaybackSource;
 *
 * Nothing outside this file should hard-code test stream URLs.
 */

export interface PlaybackSource {
  manifestUrl: string;
  posterUrl: string | null;
}

/**
 * Returns a mock HLS source for any videoId during the frontend-only phase.
 * The URL points to a publicly available test stream — safe for dev, never for prod.
 */
export function getMockPlaybackSource(_videoId: string): PlaybackSource {
  return {
    // Mux public HLS test stream — swap with real signed URL from backend later.
    manifestUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    posterUrl: null,
  };
}

"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CourseVideoPlayerProps {
  title: string;
  posterUrl?: string | null;
  lessonId?: string;
  courseId?: string;
  /** Resume playback from a specific offset (seconds). */
  initialPositionSeconds?: number;

  // ── Source (use exactly one) ───────────────────────────────────────────────
  /**
   * Direct HLS manifest URL (.m3u8). Use for non-Bunny sources or when the
   * caller already holds a safe HLS URL.
   */
  manifestUrl?: string;
  /**
   * API endpoint that returns { manifestUrl, embedUrl, provider, providerVideoId }.
   * The player fetches this on mount so signed/raw URLs never appear in SSR HTML.
   * Example: "/api/student/videos/abc123/playback"
   */
  playbackApiUrl?: string;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  /** Called every ~15 s while playing, and on pause/end. */
  onProgress?: (info: { currentTime: number; duration: number }) => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
}

// ── Playback source resolved from API ─────────────────────────────────────────

interface ResolvedSource {
  /** HLS .m3u8 URL (Bunny signed or plain). Null when using embed path. */
  manifestUrl: string | null;
  /**
   * Iframe embed URL. Set for:
   *   - YouTube  → https://www.youtube.com/embed/{id}?...
   *   - Bunny    → https://iframe.mediadelivery.net/embed/{libId}/{videoId}?...
   *                (only when hlsUrl is absent and BUNNY_LIBRARY_ID is configured)
   */
  embedUrl: string | null;
  provider: string;
  providerVideoId: string | null;
  posterUrl: string | null;
}

// ── Progress tracker hook ─────────────────────────────────────────────────────

function useProgressTracker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onProgress?: CourseVideoPlayerProps["onProgress"],
  onEnded?: CourseVideoPlayerProps["onEnded"],
) {
  const lastEmitRef = useRef<number>(0);
  const THROTTLE_MS = 15_000;

  const emit = useCallback(
    (forced = false) => {
      const el = videoRef.current;
      if (!el || isNaN(el.duration)) return;
      const now = Date.now();
      if (forced || now - lastEmitRef.current >= THROTTLE_MS) {
        lastEmitRef.current = now;
        onProgress?.({ currentTime: el.currentTime, duration: el.duration });
      }
    },
    [videoRef, onProgress],
  );

  const handleTimeUpdate = useCallback(() => emit(false), [emit]);
  const handlePause      = useCallback(() => emit(true),  [emit]);
  const handleEnded      = useCallback(() => {
    emit(true);
    onEnded?.();
  }, [emit, onEnded]);

  return { handleTimeUpdate, handlePause, handleEnded };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseVideoPlayer({
  title,
  posterUrl: posterUrlProp,
  lessonId: _lessonId,
  courseId: _courseId,
  initialPositionSeconds,
  manifestUrl: manifestUrlProp,
  playbackApiUrl,
  onProgress,
  onEnded,
  onError,
}: CourseVideoPlayerProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const hlsRef       = useRef<import("hls.js").default | null>(null);
  const loadedUrlRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Source resolution state (only used when playbackApiUrl is provided)
  const [resolved,   setResolved]   = useState<ResolvedSource | null>(null);
  const [resolving,  setResolving]  = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  // HLS initialisation state
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { handleTimeUpdate, handlePause, handleEnded } =
    useProgressTracker(videoRef, onProgress, onEnded);

  // ── Step 1: resolve source from API (when playbackApiUrl is given) ──────────

  const fetchSource = useCallback(async () => {
    if (!playbackApiUrl) return;
    setResolving(true);
    setResolveErr(null);
    try {
      const res = await fetch(playbackApiUrl);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg  = (body as { error?: string }).error ?? "Failed to load video";
        setResolveErr(msg);
        setLoading(false);
        return;
      }
      const data = await res.json() as ResolvedSource;
      setResolved(data);
    } catch {
      setResolveErr("Could not reach the video server. Please try again.");
      setLoading(false);
    } finally {
      setResolving(false);
    }
  }, [playbackApiUrl]);

  useEffect(() => {
    if (playbackApiUrl) {
      fetchSource();
    }
  }, [playbackApiUrl, fetchSource]);

  // ── Derived source values ────────────────────────────────────────────────────

  // HLS manifest URL: direct prop wins, else from API response
  const effectiveManifestUrl = manifestUrlProp ?? resolved?.manifestUrl ?? null;
  // Iframe embed URL: from API response only (never a prop — the player decides)
  const effectiveEmbedUrl    = resolved?.embedUrl ?? null;
  // Poster: prop wins over API response
  const effectivePoster      = posterUrlProp ?? resolved?.posterUrl ?? null;

  // True when this video must render as an iframe (YouTube embed or Bunny embed)
  const useIframeEmbed = Boolean(effectiveEmbedUrl);

  // ── Step 2: detect resolved-with-no-source → clear loading spinner ──────────

  useEffect(() => {
    // If the API responded but gave us neither an HLS URL nor an embed URL,
    // stop the spinner and show a "not available" message instead of spinning forever.
    if (
      !resolving &&
      resolved !== null &&
      !effectiveManifestUrl &&
      !effectiveEmbedUrl
    ) {
      setLoading(false);
      setError("This video is not available yet. Please check back later.");
    }
  }, [resolving, resolved, effectiveManifestUrl, effectiveEmbedUrl]);

  // ── Step 3: initialise HLS once we have a manifest URL ──────────────────────

  const initHls = useCallback(async () => {
    const el = videoRef.current;
    // Skip HLS init when using iframe embed or when there is no manifest
    if (!el || !effectiveManifestUrl || useIframeEmbed) return;

    // Skip re-init for the same URL
    if (loadedUrlRef.current === effectiveManifestUrl) return;
    loadedUrlRef.current = effectiveManifestUrl;

    // Tear down any existing instance
    hlsRef.current?.destroy();
    hlsRef.current = null;
    el.removeAttribute("src");

    setLoading(true);
    setError(null);
    setUnsupported(false);

    // Dynamic import — keeps hls.js out of the global bundle
    const { default: Hls } = await import("hls.js");

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(effectiveManifestUrl);
      hls.attachMedia(el);

      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (initialPositionSeconds) el.currentTime = initialPositionSeconds;
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Stream failed to load.");
          setLoading(false);
          onError?.(data);
        }
      });
    } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      el.src = effectiveManifestUrl;
      el.addEventListener("loadedmetadata", () => {
        setLoading(false);
        if (initialPositionSeconds) el.currentTime = initialPositionSeconds;
      }, { once: true });
      el.addEventListener("error", (e) => {
        setError("Video failed to load.");
        setLoading(false);
        onError?.(e);
      }, { once: true });
    } else {
      setUnsupported(true);
      setLoading(false);
    }
  }, [effectiveManifestUrl, useIframeEmbed, initialPositionSeconds, onError]);

  useEffect(() => {
    initHls();
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      loadedUrlRef.current = "";
    };
  }, [initHls]);

  // ── Retry ───────────────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (resolveErr) {
      fetchSource();
    } else {
      loadedUrlRef.current = "";
      initHls();
    }
  }, [resolveErr, fetchSource, initHls]);

  // ── Fullscreen ──────────────────────────────────────────────────────────────

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);
  void handleFullscreen;

  // ── Derived display states ─────────────────────────────────────────────────

  const showResolvingSpinner = resolving || (!!playbackApiUrl && !resolved && !resolveErr);
  const showHlsSpinner       = !showResolvingSpinner && !useIframeEmbed && loading && !error && !unsupported;
  const showError            = resolveErr ?? error ?? null;

  // ── Iframe embed (YouTube or Bunny embed player) ───────────────────────────
  // Render as soon as we have an embed URL — no loading state needed, the iframe handles it.

  if (useIframeEmbed && effectiveEmbedUrl) {
    return (
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={effectiveEmbedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  // ── HLS / native <video> player ────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full bg-black select-none group">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>

        {/* The video element — always rendered so ref is stable */}
        <video
          ref={videoRef}
          poster={effectivePoster ?? undefined}
          controls
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onEnded={handleEnded}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          aria-label={title}
        />

        {/* Resolving API spinner */}
        {showResolvingSpinner && (
          <Overlay poster={effectivePoster}>
            <SpinnerIcon />
            <p className="text-white/70 text-xs font-medium mt-3">Preparing video…</p>
          </Overlay>
        )}

        {/* HLS loading spinner */}
        {showHlsSpinner && (
          <Overlay poster={effectivePoster}>
            <SpinnerIcon />
            <p className="text-white/70 text-xs font-medium mt-3">Loading stream…</p>
          </Overlay>
        )}

        {/* Error overlay */}
        {showError && (
          <Overlay dark>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white text-sm font-semibold text-center mt-3 px-4">{showError}</p>
            {resolveErr && (
              <button
                onClick={handleRetry}
                className="mt-3 px-5 py-2 rounded-lg bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white text-sm font-semibold transition-colors"
              >
                Retry
              </button>
            )}
          </Overlay>
        )}

        {/* Unsupported browser */}
        {unsupported && (
          <Overlay dark>
            <p className="text-white text-sm font-semibold text-center px-4">
              Your browser does not support HLS video playback.
            </p>
            <p className="text-white/60 text-xs text-center mt-1 px-4">
              Please use Chrome, Firefox, or Edge for the best experience.
            </p>
          </Overlay>
        )}
      </div>
    </div>
  );
}

// ── Small shared UI helpers ───────────────────────────────────────────────────

function Overlay({
  children,
  poster,
  dark,
}: {
  children: React.ReactNode;
  poster?: string | null;
  dark?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${
        dark ? "bg-black/90" : "bg-black/80"
      }`}
    >
      {poster && !dark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
      )}
      <div className="relative z-10 flex flex-col items-center">{children}</div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

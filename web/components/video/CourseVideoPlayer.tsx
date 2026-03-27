"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CourseVideoPlayerProps {
  title: string;
  manifestUrl: string;
  posterUrl?: string | null;
  lessonId?: string;
  courseId?: string;
  /** Resume playback from a specific offset (seconds). */
  initialPositionSeconds?: number;
  /** Called every ~15 s while playing, and on pause/end. */
  onProgress?: (info: { currentTime: number; duration: number }) => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
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
  manifestUrl,
  posterUrl,
  initialPositionSeconds,
  onProgress,
  onEnded,
  onError,
}: CourseVideoPlayerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hlsRef        = useRef<import("hls.js").default | null>(null);
  const loadedUrlRef  = useRef<string>("");        // tracks last initialised URL
  const containerRef  = useRef<HTMLDivElement>(null);

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { handleTimeUpdate, handlePause, handleEnded } =
    useProgressTracker(videoRef, onProgress, onEnded);

  // ── HLS initialisation / teardown ─────────────────────────────────────────

  const initPlayer = useCallback(async () => {
    const el = videoRef.current;
    if (!el || !manifestUrl) return;

    // Avoid re-initialising for the same URL
    if (loadedUrlRef.current === manifestUrl) return;
    loadedUrlRef.current = manifestUrl;

    // Destroy any existing instance
    hlsRef.current?.destroy();
    hlsRef.current = null;
    el.removeAttribute("src");

    setLoading(true);
    setError(null);
    setUnsupported(false);

    // Lazy-import hls.js — only pulled into the bundle when the player mounts
    const { default: Hls } = await import("hls.js");

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;

      hls.loadSource(manifestUrl);
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
      // Safari — native HLS support
      el.src = manifestUrl;
      el.addEventListener(
        "loadedmetadata",
        () => {
          setLoading(false);
          if (initialPositionSeconds) el.currentTime = initialPositionSeconds;
        },
        { once: true },
      );
      el.addEventListener(
        "error",
        (e) => {
          setError("Video failed to load.");
          setLoading(false);
          onError?.(e);
        },
        { once: true },
      );
    } else {
      setUnsupported(true);
      setLoading(false);
    }
  }, [manifestUrl, initialPositionSeconds, onError]);

  // Re-run whenever manifestUrl changes (new lesson selected)
  useEffect(() => {
    initPlayer();
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      loadedUrlRef.current = "";
    };
  }, [initPlayer]);

  // ── Retry ─────────────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    loadedUrlRef.current = "";  // force re-init
    initPlayer();
  }, [initPlayer]);

  // ── Fullscreen helper (attached to the container div) ─────────────────────

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full bg-black select-none group">
      {/* 16:9 aspect wrapper */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>

        {/* The video element — always rendered so the ref is stable */}
        <video
          ref={videoRef}
          poster={posterUrl ?? undefined}
          controls
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onEnded={handleEnded}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          aria-label={title}
        />

        {/* Loading overlay */}
        {loading && !error && !unsupported && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            {posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <SpinnerIcon />
              <p className="text-white/70 text-xs font-medium">Loading video…</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 gap-3 px-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white text-sm font-semibold text-center">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-1 px-5 py-2 rounded-lg bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white text-sm font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Unsupported overlay */}
        {unsupported && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 gap-3 px-4">
            <p className="text-white text-sm font-semibold text-center">
              Your browser does not support HLS video playback.
            </p>
            <p className="text-white/60 text-xs text-center">
              Please try Chrome, Firefox, or Edge for the best experience.
            </p>
          </div>
        )}
      </div>

      {/* Title bar below player (subtle) */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-white text-sm font-medium truncate">{title}</p>
        </div>
      )}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      className="w-10 h-10 text-white animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

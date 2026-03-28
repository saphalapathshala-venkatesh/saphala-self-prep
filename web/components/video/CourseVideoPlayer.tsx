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
  manifestUrl?: string;
  playbackApiUrl?: string;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  /** Called every ~15 s while playing, and on pause/end. */
  onProgress?: (info: { currentTime: number; duration: number }) => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
}

// ── Playback source resolved from API ─────────────────────────────────────────

interface ResolvedSource {
  manifestUrl: string | null;
  embedUrl: string | null;
  provider: string;
  providerVideoId: string | null;
  posterUrl: string | null;
}

// ── Quality level ─────────────────────────────────────────────────────────────

interface QualityLevel {
  index: number;
  label: string;
  height: number;
}

const QUALITY_KEY = "saphala_video_quality";

function getPreferredQuality(): string {
  try { return localStorage.getItem(QUALITY_KEY) ?? "480p"; } catch { return "480p"; }
}

function savePreferredQuality(q: string): void {
  try { localStorage.setItem(QUALITY_KEY, q); } catch { /* ignore */ }
}

function pickLevelForHeight(levels: QualityLevel[], targetHeight: number): number {
  if (levels.length === 0) return -1;
  const candidates = levels.filter((l) => l.height > 0 && l.height <= targetHeight);
  if (candidates.length === 0) return levels[0].index;
  return candidates.reduce((best, l) => (l.height > best.height ? l : best)).index;
}

// ── Progress tracker hook ─────────────────────────────────────────────────────

function useProgressTracker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onProgress?: CourseVideoPlayerProps["onProgress"],
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

  return { handleTimeUpdate, handlePause };
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

  // One-shot guard: prevents calling onEnded more than once per video session.
  // Covers timeupdate, seeked, and the ended DOM event.
  const completionSentRef = useRef(false);

  // Stable ref to onEnded — always holds the latest prop value.
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // Source resolution state
  const [resolved,   setResolved]   = useState<ResolvedSource | null>(null);
  const [resolving,  setResolving]  = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  // HLS state
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Quality selector state
  const [availableLevels, setAvailableLevels] = useState<QualityLevel[]>([]);
  const [currentQuality,  setCurrentQuality]  = useState<string>(getPreferredQuality());
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);

  // Track whether video is ready to play (so skip buttons only show when useful)
  const [videoReady, setVideoReady] = useState(false);

  const { handleTimeUpdate, handlePause } = useProgressTracker(videoRef, onProgress);

  // ── Completion signal — single entry point ────────────────────────────────

  const fireCompletion = useCallback((reason: string) => {
    console.log(
      `[FIRE_COMPLETION_CALLED] reason=${reason} completionSentRef=${completionSentRef.current} onEndedRef=${onEndedRef.current ? "set" : "null"}`,
    );
    if (completionSentRef.current) {
      console.log("[FIRE_COMPLETION_CALLED] blocked — already sent");
      return;
    }
    completionSentRef.current = true;
    console.log("[VIDEO_COMPLETION_TRIGGERED] firing onEnded callback");
    onEndedRef.current?.();
  }, []);

  // ── Step 1: resolve source from API ─────────────────────────────────────────

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
    if (playbackApiUrl) fetchSource();
  }, [playbackApiUrl, fetchSource]);

  // ── Derived source values ────────────────────────────────────────────────────

  const effectiveManifestUrl = manifestUrlProp ?? resolved?.manifestUrl ?? null;
  const effectiveEmbedUrl    = resolved?.embedUrl ?? null;
  const effectivePoster      = posterUrlProp ?? resolved?.posterUrl ?? null;
  const useIframeEmbed       = Boolean(effectiveEmbedUrl);

  // Reset completion guard as soon as ANY source identifier changes.
  useEffect(() => {
    console.log("[COMPLETION_GUARD_RESET] completionSentRef → false");
    completionSentRef.current = false;
    setVideoReady(false);
  }, [effectiveManifestUrl, effectiveEmbedUrl, playbackApiUrl]);

  // ── Step 2: no-source guard ──────────────────────────────────────────────────

  useEffect(() => {
    if (!resolving && resolved !== null && !effectiveManifestUrl && !effectiveEmbedUrl) {
      setLoading(false);
      setError("This video is not available yet. Please check back later.");
    }
  }, [resolving, resolved, effectiveManifestUrl, effectiveEmbedUrl]);

  // ── Step 3: near-end detection for <video> element ──────────────────────────
  //
  //   "timeupdate" — fires ~4 Hz during normal playback.
  //   "seeked"     — fires immediately when the user finishes a scrub operation.
  //                  This is the key event for fast-forward / seek-to-end scenarios:
  //                  it fires before the next timeupdate tick, so completion is
  //                  detected without any perceptible delay.
  //
  // Both paths go through fireCompletion() which is guarded by completionSentRef,
  // so the XP API is always called exactly once per video session.

  useEffect(() => {
    const el = videoRef.current;
    if (!el || useIframeEmbed) return;

    function checkNearEnd(reason: string) {
      if (!el) return;
      if (completionSentRef.current) return;
      if (isNaN(el.duration) || el.duration < 1) return;
      const remaining = el.duration - el.currentTime;
      if (remaining <= 2) {
        console.log(
          `[NEAR_END_CHECK] reason=${reason} duration=${el.duration.toFixed(2)} currentTime=${el.currentTime.toFixed(2)} remaining=${remaining.toFixed(2)}`,
        );
        fireCompletion(reason);
      }
    }

    const onTimeUpdate = () => checkNearEnd("near-end-timeupdate");
    const onSeeked     = () => checkNearEnd("near-end-seeked");

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("seeked",     onSeeked);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("seeked",     onSeeked);
    };
  }, [useIframeEmbed, fireCompletion]);

  // ── Step 4: ended DOM event handler ─────────────────────────────────────────

  const handleEnded = useCallback(() => {
    console.log("[ENDED_EVENT] DOM ended event fired");
    const el = videoRef.current;
    if (el && !isNaN(el.duration)) {
      onProgress?.({ currentTime: el.currentTime, duration: el.duration });
    }
    fireCompletion("ended-event");
  }, [fireCompletion, onProgress, videoRef]);

  // ── Step 5: iframe postMessage listener (Bunny / YouTube) ───────────────────

  useEffect(() => {
    if (!useIframeEmbed) return;

    function onMessage(e: MessageEvent) {
      try {
        const raw  = e.data;
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!data || typeof data !== "object") return;

        // Bunny player: { event: "videoEnded" } or { event: "ended" }
        if (data.event === "videoEnded" || data.event === "ended") {
          console.log("[IFRAME_MESSAGE] Bunny ended event received");
          fireCompletion("iframe-bunny-ended");
          return;
        }

        // YouTube: { event: "infoDelivery", info: { playerState: 0 } }
        if (
          data.event === "infoDelivery" &&
          data.info &&
          typeof data.info === "object" &&
          data.info.playerState === 0
        ) {
          console.log("[IFRAME_MESSAGE] YouTube playerState=0 received");
          fireCompletion("iframe-youtube-ended");
          return;
        }
      } catch { /* non-JSON messages — ignore */ }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [useIframeEmbed, fireCompletion]);

  // ── Step 6: HLS initialisation with quality defaulting ──────────────────────

  const initHls = useCallback(async () => {
    const el = videoRef.current;
    if (!el || !effectiveManifestUrl || useIframeEmbed) return;
    if (loadedUrlRef.current === effectiveManifestUrl) return;
    loadedUrlRef.current = effectiveManifestUrl;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    el.removeAttribute("src");
    setLoading(true);
    setError(null);
    setUnsupported(false);
    setAvailableLevels([]);
    setVideoReady(false);

    const { default: Hls } = await import("hls.js");

    if (Hls.isSupported()) {
      const savedPreference = getPreferredQuality();
      const isAutoMode = savedPreference === "auto";
      console.log(`[VIDEO_QUALITY] saved preference="${savedPreference}" mode=${isAutoMode ? "Auto ABR" : "fixed"}`);

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: isAutoMode ? -1 : 0,
      });
      hlsRef.current = hls;
      hls.loadSource(effectiveManifestUrl);
      hls.attachMedia(el);

      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        setVideoReady(true);
        if (initialPositionSeconds) el.currentTime = initialPositionSeconds;

        const levels: QualityLevel[] = hls.levels.map((l, i) => ({
          index: i,
          label: l.height > 0 ? `${l.height}p` : `Level ${i}`,
          height: l.height ?? 0,
        }));
        if (levels.length > 1) setAvailableLevels(levels);

        if (isAutoMode) {
          hls.currentLevel = -1;
          setCurrentQuality("Auto");
          console.log("[VIDEO_QUALITY] Auto ABR active (currentLevel=-1)");
        } else {
          const targetHeight = parseInt(savedPreference, 10);
          const idx = isNaN(targetHeight)
            ? pickLevelForHeight(levels, 480)
            : pickLevelForHeight(levels, targetHeight);
          hls.currentLevel = idx;
          const matchedLabel = levels.find((l) => l.index === idx)?.label ?? `${targetHeight}p`;
          setCurrentQuality(matchedLabel);
          console.log(
            `[VIDEO_QUALITY] fixed lock: preference="${savedPreference}" → matched="${matchedLabel}" currentLevel=${idx} (ABR disabled)`,
          );
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Stream failed to load.");
          setLoading(false);
          onError?.(data);
        }
      });
    } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = effectiveManifestUrl;
      el.addEventListener("loadedmetadata", () => {
        setLoading(false);
        setVideoReady(true);
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

  // ── Quality change handler ───────────────────────────────────────────────────

  const handleQualityChange = useCallback((label: string) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (label === "Auto") {
      hls.currentLevel = -1;
      setCurrentQuality("Auto");
      savePreferredQuality("auto");
    } else {
      const level = availableLevels.find((l) => l.label === label);
      if (level) {
        hls.currentLevel = level.index;
        setCurrentQuality(level.label);
        savePreferredQuality(level.label);
        console.log(`[VIDEO_QUALITY] switched to ${level.label} (level=${level.index})`);
      }
    }
    setQualityMenuOpen(false);
  }, [availableLevels]);

  // ── Skip controls ────────────────────────────────────────────────────────────

  const handleSkipBackward = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, el.currentTime - 10);
  }, []);

  const handleSkipForward = useCallback(() => {
    const el = videoRef.current;
    if (!el || isNaN(el.duration)) return;
    // Do NOT clamp to duration - 2 here. We deliberately allow seeking to the
    // last 2 seconds so the near-end detection (seeked event) can fire.
    el.currentTime = Math.min(el.duration, el.currentTime + 10);
  }, []);

  // ── Retry ────────────────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (resolveErr) {
      fetchSource();
    } else {
      loadedUrlRef.current = "";
      initHls();
    }
  }, [resolveErr, fetchSource, initHls]);

  // ── Derived display states ───────────────────────────────────────────────────

  const showResolvingSpinner = resolving || (!!playbackApiUrl && !resolved && !resolveErr);
  const showHlsSpinner       = !showResolvingSpinner && !useIframeEmbed && loading && !error && !unsupported;
  const showError            = resolveErr ?? error ?? null;
  const showSkipControls     = videoReady && !showError && !unsupported && !useIframeEmbed;

  // ── Iframe embed (YouTube or Bunny embed player) ──────────────────────────────

  if (useIframeEmbed && effectiveEmbedUrl) {
    return (
      <div>
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={effectiveEmbedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  // ── HLS / native <video> player ──────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full bg-black select-none">
      {/* 16:9 video container */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>

        {/* Video element — always rendered so ref is stable */}
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

        {/* Resolving spinner */}
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

        {/* Quality selector — top-right */}
        {availableLevels.length > 1 && videoReady && !showError && (
          <div className="absolute top-2 right-2 z-20">
            <div className="relative">
              <button
                onClick={() => setQualityMenuOpen((o) => !o)}
                className="flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/20 transition-colors"
                aria-label="Video quality"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {currentQuality}
              </button>

              {qualityMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-black/90 border border-white/20 rounded-lg py-1 min-w-[90px] z-30 shadow-lg">
                  <button
                    onClick={() => handleQualityChange("Auto")}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-white/10 transition-colors ${currentQuality === "Auto" ? "text-[#9B7BE0]" : "text-white"}`}
                  >
                    Auto
                  </button>
                  {[...availableLevels].reverse().map((l) => (
                    <button
                      key={l.index}
                      onClick={() => handleQualityChange(l.label)}
                      className={`w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-white/10 transition-colors ${currentQuality === l.label ? "text-[#9B7BE0]" : "text-white"}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Skip controls — shown below the video when ready ─────────────────── */}
      {showSkipControls && (
        <div className="flex items-center justify-center gap-4 py-2 bg-black/95">
          {/* Back 10s */}
          <button
            onClick={handleSkipBackward}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Skip back 10 seconds"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
            10s
          </button>

          {/* Forward 10s */}
          <button
            onClick={handleSkipForward}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Skip forward 10 seconds"
          >
            10s
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Small shared UI helpers ────────────────────────────────────────────────────

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

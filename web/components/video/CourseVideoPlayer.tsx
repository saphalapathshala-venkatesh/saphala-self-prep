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
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const hlsRef       = useRef<import("hls.js").default | null>(null);
  const loadedUrlRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Bunny iframe time tracking.
  // bunnyCurrentTimeRef: primary elapsed-time source for skip controls.
  //   Incremented every second by a wall-clock setInterval that starts
  //   on iframe load (handleIframeLoad).  If Bunny DOES send timeupdate
  //   events, those overwrite the value with the accurate server position.
  //   Either way the value accumulates correctly for multiple skips.
  // bunnyDurationRef: set from timeupdate.duration or ready payload.
  // bunnyTimerRef: the setInterval handle — cleared on source change/unmount.
  const bunnyCurrentTimeRef = useRef<number>(0);
  const bunnyDurationRef    = useRef<number>(0);
  const bunnyTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Bunny iframe: tracks whether manual completion was already triggered
  // (hides the "Mark as Watched" button after it is clicked)
  const [bunnyManualDone, setBunnyManualDone] = useState(false);

  // Bunny iframe src — controlled so we can reload at a new startTime for seek.
  // Initialised from effectiveEmbedUrl; updated by skip handlers.
  const [iframeSrc, setIframeSrc] = useState<string>("");

  // Fullscreen state — true when bunnyContainerRef is the fullscreen element.
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref for the Bunny player outer container — used for custom fullscreen.
  const bunnyContainerRef = useRef<HTMLDivElement>(null);

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

  // Reset completion guard + Bunny timer as soon as ANY source changes.
  useEffect(() => {
    console.log("[COMPLETION_GUARD_RESET] completionSentRef → false");
    completionSentRef.current = false;
    setVideoReady(false);
    // Clear wall-clock timer so it restarts fresh for the new source
    if (bunnyTimerRef.current) {
      clearInterval(bunnyTimerRef.current);
      bunnyTimerRef.current = null;
    }
    bunnyCurrentTimeRef.current = 0;
    bunnyDurationRef.current    = 0;
    setBunnyManualDone(false);
  }, [effectiveManifestUrl, effectiveEmbedUrl, playbackApiUrl]);

  // Bunny timer cleanup on component unmount
  useEffect(() => {
    return () => {
      if (bunnyTimerRef.current) clearInterval(bunnyTimerRef.current);
    };
  }, []);

  // Keep iframeSrc in sync with the resolved embed URL.
  // Skip handlers update iframeSrc independently to add &startTime=N.
  useEffect(() => {
    if (effectiveEmbedUrl) setIframeSrc(effectiveEmbedUrl);
  }, [effectiveEmbedUrl]);

  // Track whether the Bunny container is the active fullscreen element.
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement &&
        (document.fullscreenElement === bunnyContainerRef.current ||
         bunnyContainerRef.current?.contains(document.fullscreenElement) === true),
      );
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Toggle fullscreen on the Bunny container (our outer div, not the iframe).
  // This keeps our skip buttons inside the fullscreen context.
  const handleBunnyFullscreen = useCallback(async () => {
    const el = bunnyContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch { /* browser may deny fullscreen in some contexts */ }
  }, []);

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

  // ── Step 5: Bunny iframe load handler ───────────────────────────────────────
  //
  // When the Bunny embed iframe finishes loading its document, we send an
  // initial { action: 'subscribe' } so it starts posting events.
  // We also re-send on playerReady in case the iframe fires that event before
  // our onLoad fires (race condition on fast connections).

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // ── Start wall-clock elapsed-time tracker ────────────────────────────
    // Increments bunnyCurrentTimeRef every second. This is the PRIMARY
    // time source for skip controls and works even if Bunny never sends
    // timeupdate events. If timeupdate events DO come, they overwrite
    // the local value with the accurate player position.
    if (bunnyTimerRef.current) clearInterval(bunnyTimerRef.current);
    bunnyTimerRef.current = setInterval(() => {
      bunnyCurrentTimeRef.current += 1;
    }, 1000);

    // ── Subscribe using BOTH known formats ───────────────────────────────
    // Bunny docs are inconsistent: some examples use { action: "subscribe" },
    // others use { event: "subscribe" }. We send both to maximise the chance
    // that timeupdate and ended events are enabled.
    iframe.contentWindow.postMessage(JSON.stringify({ action: "subscribe" }), "*");
    iframe.contentWindow.postMessage(JSON.stringify({ event:  "subscribe" }), "*");

    // Mark ready immediately so skip buttons appear without waiting for events.
    setVideoReady(true);
    console.log("[BUNNY_IFRAME] loaded — wall-clock timer started, both subscribe formats sent");
  }, []);

  // ── Step 6: iframe postMessage listener (Bunny / YouTube) ───────────────────
  //
  // Bunny embed player events (received after subscribing):
  //   playerReady  — player is initialised; re-send subscribe and mark ready
  //   timeupdate   — { event, currentTime, duration } fired ~every second
  //   ended        — video playback reached the end
  //   play/pause   — (unused, ignored)
  //
  // Bunny embed player commands (sent TO the iframe):
  //   { action: 'subscribe' }            — start receiving events
  //   { action: 'seek', currentTime: N } — jump to position N seconds
  //
  // YouTube events are handled separately via infoDelivery / playerState.

  useEffect(() => {
    if (!useIframeEmbed) return;

    function onMessage(e: MessageEvent) {
      try {
        const raw  = e.data;
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!data || typeof data !== "object") return;

        const event = (data.event as string | undefined) ?? "";

        // Log every Bunny event (except noisy timeupdate) for debugging
        if (event && event !== "timeupdate") {
          console.log("[BUNNY_EVENT]", event, data);
        }

        // ── Bunny: ready / playerReady ────────────────────────────────────
        // Bunny sends { event: "ready" } (not "playerReady") after the
        // player initialises. Re-subscribe with BOTH known formats after
        // ready to unlock ongoing timeupdate / ended event delivery.
        // Also extract duration from the payload if present.
        if (event === "ready" || event === "playerReady") {
          console.log("[BUNNY_READY] payload:", JSON.stringify(data));
          // Extract duration if Bunny includes it in the ready payload
          const readyDur = Number((data as Record<string, unknown>).duration ?? 0);
          if (readyDur > 0) {
            bunnyDurationRef.current = readyDur;
            console.log("[BUNNY_READY] duration extracted:", readyDur);
          }
          // Re-subscribe with both formats
          const win = iframeRef.current?.contentWindow;
          if (win) {
            win.postMessage(JSON.stringify({ action: "subscribe" }), "*");
            win.postMessage(JSON.stringify({ event:  "subscribe" }), "*");
          }
          setVideoReady(true);
          return;
        }

        // ── Bunny: timeupdate ──────────────────────────────────────────────
        if (event === "timeupdate") {
          const ct  = Number(data.currentTime ?? 0);
          const dur = Number(data.duration    ?? 0);
          // Log first 3 timeupdate events to confirm events are flowing
          if (ct < 4) {
            console.log("[BUNNY_TIMEUPDATE] ct=" + ct.toFixed(2) + " dur=" + dur.toFixed(2));
          }
          bunnyCurrentTimeRef.current = ct;
          if (dur > 0) bunnyDurationRef.current = dur;
          setVideoReady(true);
          return;
        }

        // ── Bunny: ended ───────────────────────────────────────────────────
        if (event === "ended" || event === "videoEnded") {
          console.log("[BUNNY_IFRAME] ended event — firing completion");
          fireCompletion("iframe-bunny-ended");
          return;
        }

        // ── YouTube: infoDelivery + playerState=0 ─────────────────────────
        if (
          event === "infoDelivery" &&
          data.info &&
          typeof data.info === "object" &&
          (data.info as Record<string, unknown>).playerState === 0
        ) {
          console.log("[IFRAME_MESSAGE] YouTube playerState=0 — firing completion");
          fireCompletion("iframe-youtube-ended");
          return;
        }
      } catch { /* non-JSON postMessages (React DevTools, extensions) — ignore */ }
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

  // ── Skip controls — HLS / native <video> ────────────────────────────────────

  const handleSkipBackward = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, el.currentTime - 10);
  }, []);

  const handleSkipForward = useCallback(() => {
    const el = videoRef.current;
    if (!el || isNaN(el.duration)) return;
    el.currentTime = Math.min(el.duration, el.currentTime + 10);
  }, []);

  // ── Skip controls — Bunny iframe (postMessage seek) ──────────────────────────
  //
  // Bunny's embed player accepts { action: 'seek', currentTime: N } via
  // postMessage. currentTime is tracked from timeupdate events.

  // ── Bunny skip: reload the iframe with &startTime=N ──────────────────────────
  // postMessage seek does NOT move the Bunny player reliably.
  // Changing the iframe src to include &startTime=N is guaranteed to seek.
  // bunnyCurrentTimeRef is already up-to-date (wall-clock timer), so the
  // value we pass is accurate, and the timer continues from there on reload.

  // Build a Bunny embed URL for seeking: forces autoplay=true so the video
  // resumes playing after the iframe reloads at the new position.
  const buildBunnySeekUrl = useCallback((startTime: number): string => {
    if (!effectiveEmbedUrl) return "";
    // Replace autoplay=false with autoplay=true, then append startTime.
    const base = effectiveEmbedUrl.replace(/autoplay=false/i, "autoplay=true");
    return base + "&startTime=" + Math.floor(startTime);
  }, [effectiveEmbedUrl]);

  const handleBunnySkipBackward = useCallback(() => {
    const ct      = bunnyCurrentTimeRef.current;
    const newTime = Math.max(0, ct - 10);
    console.log("[BUNNY_SKIP] ← backward | ct=" + ct.toFixed(1) + "s → reload at startTime=" + Math.floor(newTime) + " (autoplay=true)");
    bunnyCurrentTimeRef.current = newTime;
    setIframeSrc(buildBunnySeekUrl(newTime));
  }, [buildBunnySeekUrl]);

  const handleBunnySkipForward = useCallback(() => {
    const ct      = bunnyCurrentTimeRef.current;
    const dur     = bunnyDurationRef.current;
    const newTime = dur > 0 ? Math.min(dur, ct + 10) : ct + 10;
    console.log("[BUNNY_SKIP] → forward  | ct=" + ct.toFixed(1) + "s dur=" + dur.toFixed(1) + "s → reload at startTime=" + Math.floor(newTime) + " (autoplay=true)");
    bunnyCurrentTimeRef.current = newTime;
    setIframeSrc(buildBunnySeekUrl(newTime));
  }, [buildBunnySeekUrl]);

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
  //
  // Bunny embed:
  //   - iframeSrc state controls the src; skip handlers update it with &startTime=N
  //     which is the ONLY reliable way to seek in Bunny's embed player.
  //   - Wall-clock setInterval tracks elapsed time so consecutive skips accumulate.
  //   - Skip buttons are shown:
  //       • Normal mode  → below the video (in the black bar)
  //       • Fullscreen   → overlaid at the bottom of the video (absolute positioned
  //                        inside the 16:9 wrapper, above the iframe). This works
  //                        because we call requestFullscreen() on bunnyContainerRef
  //                        (the outer div), keeping our React overlay inside the
  //                        fullscreen context.
  //   - Custom fullscreen button (Expand/Collapse icon) sits next to the skip buttons
  //     in both modes and toggles bunnyContainerRef fullscreen.
  //
  // YouTube embed:
  //   - No skip controls (YouTube doesn't support seek via postMessage)
  //   - Completion detected via infoDelivery / playerState=0

  const isBunnyEmbed = resolved?.provider === "BUNNY" && Boolean(effectiveEmbedUrl);

  // Shared skip + fullscreen button bar — used in both normal and fullscreen modes.
  const bunnyControlBar = (overlay: boolean) => (
    <div
      className={
        overlay
          // Fullscreen overlay: pinned to bottom of the 16:9 wrapper, above the iframe.
          // pointer-events-none on wrapper so clicks pass through to Bunny player;
          // pointer-events-auto re-enabled per-button.
          ? "absolute bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/85 to-transparent pointer-events-none"
          // Normal mode: plain flex row below the video.
          : "flex items-center justify-between px-4 py-2 bg-black/95"
      }
    >
      {/* ← 10 s */}
      <button
        onClick={handleBunnySkipBackward}
        className={`flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors ${overlay ? "pointer-events-auto" : ""}`}
        aria-label="Skip back 10 seconds"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
        </svg>
        10s
      </button>

      {/* Fullscreen toggle */}
      <button
        onClick={handleBunnyFullscreen}
        className={`flex items-center gap-1 text-white/70 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors ${overlay ? "pointer-events-auto" : ""}`}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          /* Collapse icon */
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
          </svg>
        ) : (
          /* Expand icon */
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
        {isFullscreen ? "Exit" : "Fullscreen"}
      </button>

      {/* 10 s → */}
      <button
        onClick={handleBunnySkipForward}
        className={`flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors ${overlay ? "pointer-events-auto" : ""}`}
        aria-label="Skip forward 10 seconds"
      >
        10s
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
        </svg>
      </button>
    </div>
  );

  if (useIframeEmbed && effectiveEmbedUrl) {
    return (
      <div ref={bunnyContainerRef} className="relative w-full bg-black select-none">
        {/* ── 16:9 video box ─────────────────────────────────────────────── */}
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            ref={isBunnyEmbed ? iframeRef : undefined}
            src={iframeSrc || effectiveEmbedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={isBunnyEmbed ? handleIframeLoad : undefined}
            className="absolute inset-0 w-full h-full border-0"
          />

          {/* Fullscreen-mode skip controls: overlaid at bottom of the video box.
              Visible because bunnyContainerRef (our outer div) is the fullscreen
              element — so our React children remain inside the fullscreen context. */}
          {isBunnyEmbed && videoReady && isFullscreen && bunnyControlBar(true)}
        </div>

        {/* Normal-mode skip controls: below the video, always visible. */}
        {isBunnyEmbed && videoReady && !isFullscreen && bunnyControlBar(false)}

        {/* ── Mark as Watched button ────────────────────────────────────────
            Guaranteed XP trigger for Bunny iframe videos.
            fireCompletion is already guarded (completionSentRef), so
            clicking after automatic detection is a safe no-op.
            Hidden in fullscreen (user can exit first, then click). */}
        {isBunnyEmbed && !bunnyManualDone && !isFullscreen && (
          <div className="px-4 pb-3 pt-1 bg-black/95">
            <button
              onClick={() => {
                setBunnyManualDone(true);
                fireCompletion("manual-mark-watched");
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#2D1B69] hover:bg-[#6D4BCB] text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Mark as Watched &amp; Earn XP
            </button>
          </div>
        )}
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

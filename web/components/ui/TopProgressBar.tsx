"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const growRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRouteRef = useRef<string>("");
  const startedRef = useRef(false);
  const completeRef = useRef(false);

  function clearTimers() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (growRef.current) { clearInterval(growRef.current); growRef.current = null; }
  }

  function startBar() {
    clearTimers();
    setVisible(true);
    setWidth(0);
    completeRef.current = false;
    startedRef.current = true;

    // Small delay before appearing — only show if navigation takes >250ms
    timerRef.current = setTimeout(() => {
      setWidth(15);
      // Grow slowly from 15% to 85% over ~4s — simulating uncertain progress
      let current = 15;
      growRef.current = setInterval(() => {
        if (current >= 85) {
          if (growRef.current) clearInterval(growRef.current);
          return;
        }
        // Slow down as it gets further along
        const increment = current < 50 ? 4 : current < 70 ? 2 : 0.5;
        current = Math.min(85, current + increment);
        setWidth(current);
      }, 300);
    }, 250);
  }

  function completeBar() {
    if (!startedRef.current) return;
    clearTimers();
    completeRef.current = true;
    setWidth(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
      startedRef.current = false;
    }, 300);
  }

  // Detect route CHANGE (navigation complete)
  useEffect(() => {
    const route = pathname + "?" + searchParams.toString();
    if (prevRouteRef.current && prevRouteRef.current !== route) {
      completeBar();
    }
    prevRouteRef.current = route;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Detect navigation START by intercepting anchor clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || target.getAttribute("target") === "_blank") return;
      // Only internal same-origin links
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const currentRoute = window.location.pathname + window.location.search;
        const nextRoute = url.pathname + url.search;
        if (currentRoute === nextRoute) return;
        startBar();
      } catch {}
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible && width === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-[#6D4BCB] transition-all"
      style={{
        width: `${width}%`,
        opacity: visible ? 1 : 0,
        transition: width === 100
          ? "width 200ms ease-out, opacity 300ms ease-out"
          : "width 300ms ease-out",
        boxShadow: "0 0 8px rgba(109, 75, 203, 0.6)",
      }}
    />
  );
}

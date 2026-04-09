"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently refreshes the page at key live class transitions:
 * - UPCOMING → LIVE_NOW (at joinWindowStart = startTime - 10 min)
 * - LIVE_NOW → ENDED   (at endTime)
 *
 * This ensures the Join button disappears automatically when
 * the class ends without the student needing to manually refresh.
 */
export default function LiveClassAutoRefresh({
  liveStatus,
  sessionDate,
  startTime,
  endTime,
}: {
  liveStatus: string;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!sessionDate || !startTime) return;
    if (liveStatus !== "LIVE_NOW" && liveStatus !== "UPCOMING") return;

    // Re-construct IST datetimes from date+time strings
    const d = new Date(sessionDate);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const [startH, startM] = startTime.split(":").map(Number);
    const startISO = `${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00+05:30`;
    const startDateTime = new Date(startISO);
    const joinWindowStart = new Date(startDateTime.getTime() - 10 * 60 * 1000);

    let endDateTime: Date;
    if (endTime) {
      const [endH, endM] = endTime.split(":").map(Number);
      const endISO = `${dateStr}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00+05:30`;
      endDateTime = new Date(endISO);
    } else {
      endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
    }

    const now = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule refresh when class ends (most important — removes Join button)
    const msUntilEnd = endDateTime.getTime() - now;
    if (msUntilEnd > 0 && msUntilEnd < 12 * 60 * 60 * 1000) {
      timers.push(setTimeout(() => router.refresh(), msUntilEnd + 2000));
    }

    // Schedule refresh when join window opens (UPCOMING → LIVE_NOW)
    if (liveStatus === "UPCOMING") {
      const msUntilJoin = joinWindowStart.getTime() - now;
      if (msUntilJoin > 0 && msUntilJoin < 12 * 60 * 60 * 1000) {
        timers.push(setTimeout(() => router.refresh(), msUntilJoin + 1000));
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [liveStatus, sessionDate, startTime, endTime, router]);

  return null;
}

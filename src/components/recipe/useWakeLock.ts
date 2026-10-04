"use client";

import { useEffect, useState } from "react";

export type WakeLockStatus = "pending" | "active" | "unavailable";

/**
 * Keeps the screen on while mounted (Screen Wake Lock API).
 * Not supported or refused (e.g. iOS PWA before 18.4, low battery): status "unavailable", no error.
 * The lock is released by the browser when the page is hidden, so it is taken again on return.
 */
export function useWakeLock(): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("pending");

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (!("wakeLock" in navigator)) {
        setStatus("unavailable");
        return;
      }
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setStatus("active");
      } catch {
        setStatus("unavailable");
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  return status;
}

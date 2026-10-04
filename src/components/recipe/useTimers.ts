"use client";

import { useCallback, useEffect, useState } from "react";

type Timer = { endsAt: number; label: string };

/** Plays a short flat beep with Web Audio (no asset to cache). */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio blocked or unsupported: vibration and the visual alert remain.
  }
}

/**
 * Countdown timers keyed by step id. Based on end timestamps, so they stay right
 * when the tab sleeps. Calls onDone(label) when one finishes.
 */
export function useTimers(onDone: (label: string) => void) {
  const [timers, setTimers] = useState<Record<string, Timer>>({});
  const [now, setNow] = useState(() => Date.now());

  const running = Object.keys(timers).length > 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const finished = Object.entries(timers).filter(([, timer]) => timer.endsAt <= now);
    if (finished.length === 0) return;
    for (const [, timer] of finished) {
      navigator.vibrate?.([300, 150, 300]);
      beep();
      onDone(timer.label);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- removing timers that just finished
    setTimers((all) => Object.fromEntries(Object.entries(all).filter(([, timer]) => timer.endsAt > now)));
  }, [now, timers, onDone]);

  const start = useCallback((id: string, seconds: number, label: string) => {
    const t = Date.now();
    setNow(t);
    setTimers((all) => ({ ...all, [id]: { endsAt: t + seconds * 1000, label } }));
  }, []);

  const stop = useCallback((id: string) => {
    setTimers((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
  }, []);

  const remaining = useCallback(
    (id: string): number | null => {
      const timer = timers[id];
      return timer ? Math.max(0, (timer.endsAt - now) / 1000) : null;
    },
    [timers, now],
  );

  return { start, stop, remaining };
}

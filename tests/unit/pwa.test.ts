import { beforeEach, describe, expect, it } from "vitest";
import { bannerDismissed, dismissBanner } from "@/lib/pwa";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage;
});

describe("install banner", () => {
  const day = 86_400_000;
  it("shows until closed", () => {
    expect(bannerDismissed()).toBe(false);
  });
  it("stays away 14 days once closed", () => {
    const now = Date.parse("2026-10-04T12:00:00Z");
    dismissBanner(now);
    expect(bannerDismissed(now + 13 * day)).toBe(true);
    expect(bannerDismissed(now + 14 * day + 1)).toBe(false);
  });
  it("still shows when storage is unavailable", () => {
    globalThis.localStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
    expect(() => dismissBanner()).not.toThrow();
    expect(bannerDismissed()).toBe(false);
  });
});

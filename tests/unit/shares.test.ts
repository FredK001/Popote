import { describe, expect, it } from "vitest";
import { claimPath, isShareToken, tokenFromClaimPath } from "@/lib/share-token";
import { timeAgo } from "@/lib/time-ago";

const TOKEN = "q3Z0Hc1dQnS4kN7pYw2xVg";

describe("share tokens", () => {
  it("accepts base64url tokens of 128 bits", () => {
    expect(isShareToken(TOKEN)).toBe(true);
  });

  it.each(["short", "../etc/passwd", "a".repeat(65), "q3Z0Hc1dQnS4kN7pYw2xV=g"])("rejects %s", (token) => {
    expect(isShareToken(token)).toBe(false);
  });

  it("round-trips the pending claim path", () => {
    expect(tokenFromClaimPath(claimPath(TOKEN))).toBe(TOKEN);
    expect(tokenFromClaimPath("/carnet")).toBeNull();
    expect(tokenFromClaimPath(`/r/${TOKEN}/ajouter/../../admin`)).toBeNull();
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  it.each([
    ["2026-10-04T11:59:50Z", "à l'instant"],
    ["2026-10-04T11:48:00Z", "12 minutes"],
    ["2026-10-04T09:00:00Z", "3 heures"],
    ["2026-10-03T12:00:00Z", "1 jour"],
  ])("%s → %s", (iso, label) => {
    expect(timeAgo(iso, now)).toBe(label);
  });
});

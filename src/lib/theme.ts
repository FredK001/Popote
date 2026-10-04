/**
 * Literal colours needed outside CSS (viewport theme-color, web manifest, OG images).
 * Must match src/styles/tokens.css — checked in tests/unit/design-guard.test.ts.
 */
export const THEME_COLOR = "#f7f2ea"; // --fond
export const BRAND_COLOR = "#c7381f"; // --tomate

/** Palette for generated images (next/og cannot read CSS variables). */
export const OG_COLORS = {
  fond: "#f7f2ea",
  surface: "#ffffff",
  encre: "#2a1e19",
  "encre-2": "#5b4a3f",
  tomate: "#c7381f",
  laiton: "#8a6a22",
  blanc: "#ffffff",
  "fond-2": "#eee8df",
} as const;

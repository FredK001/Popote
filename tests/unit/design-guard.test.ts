import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_COLOR, OG_COLORS, THEME_COLOR } from "@/lib/theme";
import { readColorTokens } from "./tokens";

const ROOT = process.cwd();
// Files allowed to hold literal colours.
const ALLOWED = new Set(["src/styles/tokens.css", "src/lib/theme.ts"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(join(ROOT, "src"))
  .map((path) => ({
    path: relative(ROOT, path),
    // Theme resets (`--shadow-*: initial;`) remove features, they are not usages.
    content: readFileSync(path, "utf8").replace(/^\s*--[\w-]+-\*:\s*initial;$/gm, ""),
  }))
  .filter((f) => !ALLOWED.has(f.path));

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: "hardcoded hex colour", pattern: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/ },
  { name: "rgb()/hsl() colour", pattern: /\b(rgba?|hsla?)\(/ },
  { name: "gradient", pattern: /gradient|bg-linear-|bg-radial-|bg-conic-/ },
  { name: "shadow", pattern: /box-shadow|\bshadow-(?!none)|drop-shadow/ },
  { name: "emoji", pattern: /\p{Extended_Pictographic}/u },
];

describe("design guard", () => {
  it.each(RULES)("no $name in components and pages", ({ pattern }) => {
    const offenders = files.filter((f) => pattern.test(f.content)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("theme literals match the tokens", () => {
    const tokens = readColorTokens();
    expect(THEME_COLOR).toBe(tokens.fond);
    expect(BRAND_COLOR).toBe(tokens.tomate);
    for (const [name, value] of Object.entries(OG_COLORS)) expect(value, name).toBe(tokens[name]);
  });
});

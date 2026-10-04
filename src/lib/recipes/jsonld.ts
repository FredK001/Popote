import type { RecipeDraft } from "@/lib/ai/schema";
import { aisleFor } from "./ingredient-catalog";
import { parseIngredientLine } from "./ingredient-line";
import { guessIngredientKey } from "./ingredient-picto";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const isObject = (v: Json | undefined): v is JsonObject => typeof v === "object" && v !== null && !Array.isArray(v);

function hasType(node: JsonObject, type: string): boolean {
  const t = node["@type"];
  return t === type || (Array.isArray(t) && t.includes(type));
}

/** Finds the first schema.org Recipe in the page's JSON-LD blocks (top level, arrays or @graph). */
export function findRecipeNode(html: string): JsonObject | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, content] of blocks) {
    let data: Json;
    try {
      data = JSON.parse(content.trim()) as Json;
    } catch {
      continue;
    }
    const queue: Json[] = [data];
    while (queue.length) {
      const node = queue.shift();
      if (Array.isArray(node)) queue.push(...node);
      else if (isObject(node)) {
        if (hasType(node, "Recipe")) return node;
        if (node["@graph"]) queue.push(node["@graph"]);
      }
    }
  }
  return null;
}

const text = (v: Json | undefined): string | null => {
  if (typeof v === "string") return decodeEntities(v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (isObject(v)) return text(v.text ?? v.name);
  return null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

/** ISO 8601 duration ("PT1H20M", "P0DT0H45M") → minutes. */
export function isoDurationToMinutes(v: Json | undefined): number | null {
  const s = text(v);
  const m = s?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/i);
  if (!m) return null;
  const minutes = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return minutes > 0 ? minutes : null;
}

/** "4", "4 personnes", ["4", "4 servings"] → 4. */
export function yieldToServings(v: Json | undefined): number | null {
  const values = Array.isArray(v) ? v : [v];
  for (const value of values) {
    const m = text(value)?.match(/\d+/);
    if (m) {
      const n = Number(m[0]);
      if (n >= 1 && n <= 50) return n;
    }
  }
  return null;
}

/** HowToStep / HowToSection / strings → flat list of step texts. */
function instructions(v: Json | undefined): string[] {
  if (v == null) return [];
  if (typeof v === "string") {
    return decodeEntities(v)
      .split(/\n+|(?<=\.)\s+(?=\d+[.)]\s)/)
      .map((s) => s.replace(/<[^>]+>/g, " ").replace(/^\s*\d+[.)]\s*/, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap((item) => instructions(item));
  if (isObject(v)) {
    if (hasType(v, "HowToSection")) return instructions(v.itemListElement);
    const t = text(v.text ?? v.name);
    return t ? [t] : [];
  }
  return [];
}

const CATEGORY_WORDS: Array<[RegExp, RecipeDraft["category_key"]]> = [
  [/dessert|gâteau|gateau|tarte sucrée|pâtisserie|patisserie/i, "desserts"],
  [/entrée|entree|starter|soupe|salade/i, "starters"],
  [/apéritif|aperitif|apéro|apero|amuse/i, "apero"],
  [/brunch|petit[- ]déjeuner|breakfast/i, "brunch"],
  [/plat|main|dîner|diner/i, "mains"],
];

const high = <T,>(value: T | null) => ({ value, confidence: "high" as const, alternatives: [] as T[] });

/** Turns a schema.org Recipe into a draft, without any AI. Null when unusable. */
export function recipeFromJsonLd(node: JsonObject): RecipeDraft | null {
  const ingredientLines = (Array.isArray(node.recipeIngredient) ? node.recipeIngredient : Array.isArray(node.ingredients) ? node.ingredients : [])
    .map((l) => text(l))
    // Drop section headers such as "Pour la pâte :".
    .filter((l): l is string => Boolean(l) && !/^[^\d]*:\s*$/.test(l!));
  const steps = instructions(node.recipeInstructions);
  const title = text(node.name);
  if (!title || ingredientLines.length === 0 || steps.length === 0) return null;

  const prep = isoDurationToMinutes(node.prepTime);
  const cook = isoDurationToMinutes(node.cookTime);
  const total = isoDurationToMinutes(node.totalTime);
  const categoryText = [text(node.recipeCategory), text(node.keywords)].filter(Boolean).join(" ");

  return {
    title: high(title.slice(0, 120)),
    description: text(node.description)?.slice(0, 500) ?? null,
    servings: high(yieldToServings(node.recipeYield)),
    prep_minutes: high(prep ?? (total && !cook ? total : null)),
    cook_minutes: high(cook),
    difficulty: { value: null, confidence: "high", alternatives: [] },
    category_key: CATEGORY_WORDS.find(([re]) => re.test(categoryText))?.[1] ?? null,
    tags: [],
    origin_label: null,
    ingredients: ingredientLines.slice(0, 80).map((line) => {
      const parsed = parseIngredientLine(line);
      const key = guessIngredientKey(parsed.name);
      return {
        ...parsed,
        name: parsed.name.slice(0, 120),
        ingredient_key: key,
        aisle: key ? aisleFor(key) : null,
        confidence: "high" as const,
        alternatives: [],
      };
    }),
    steps: steps.slice(0, 60).map((s) => ({ text: s.slice(0, 2000), timer_minutes: null })),
    questions: [],
    dish_photo_index: null,
    problem: "none",
  };
}

/** First image URL of a schema.org image value (string, list, or ImageObject). */
function imageUrl(v: Json | undefined): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    for (const item of v) {
      const url = imageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (isObject(v)) return imageUrl(v.url ?? v.contentUrl ?? v["@id"]);
  return null;
}

/**
 * The recipe's photo: schema.org Recipe image first, then the page's og:image.
 * Resolved against the page URL; http(s) only.
 */
export function recipeImageUrl(html: string, node: JsonObject | null, pageUrl: string): string | null {
  const og =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1] ??
    null;
  const raw = (node && imageUrl(node.image)) ?? (og ? decodeEntities(og) : null);
  if (!raw) return null;
  try {
    const url = new URL(raw, pageUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Readable text of a page, for the AI fallback when there is no JSON-LD. */
export function pageText(html: string, maxChars = 30000): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, maxChars);
}

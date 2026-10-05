import { z } from "zod";

const optionalInt = (min: number, max: number) =>
  z.union([z.number().int().min(min).max(max), z.null()]).default(null);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

export const ingredientInput = z.object({
  id: z.uuid().nullable().default(null),
  quantity: z.number().positive().max(100000).nullable().default(null),
  unit: optionalText(30),
  name: z.string().trim().min(1).max(120),
  ingredient_key: optionalText(40),
});

export const stepInput = z.object({
  id: z.uuid().nullable().default(null),
  text: z.string().trim().min(1).max(2000),
  timer_seconds: optionalInt(1, 86400),
});

/** What the manual recipe form submits. */
export const recipeInput = z.object({
  id: z.uuid().nullable().default(null),
  title: z.string().trim().min(1).max(120),
  description: optionalText(2000),
  servings: z.number().int().min(1).max(50).default(4),
  prep_minutes: optionalInt(0, 2880),
  cook_minutes: optionalInt(0, 2880),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]).default(null),
  photo_path: optionalText(300),
  source_url: z
    .union([z.url({ protocol: /^https?$/ }), z.literal(""), z.null()])
    .transform((v) => (v ? v : null))
    .default(null),
  origin_label: optionalText(80),
  origin_year: optionalInt(1800, 2100),
  category_id: z.uuid().nullable().default(null),
  /** New recipe written from another one ("Créer ma variante"). */
  variant_of: z.uuid().nullable().default(null),
  ingredients: z.array(ingredientInput).max(80),
  steps: z.array(stepInput).max(60),
});

export type RecipeInput = z.input<typeof recipeInput>;
export type RecipeData = z.output<typeof recipeInput>;

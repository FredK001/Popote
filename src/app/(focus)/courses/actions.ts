"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(focus)/recette/actions";
import { getUserId } from "@/lib/auth";
import { guessIngredientKey } from "@/lib/recipes/ingredient-picto";
import { parseIngredientLine } from "@/lib/recipes/ingredient-line";
import { aisleOf } from "@/lib/shopping";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

const uuid = z.uuid();

async function client() {
  const userId = await getUserId();
  return userId ? { userId, supabase: await createClient() } : null;
}

function done(error: unknown): ActionResult {
  if (error) return { error: t.errors.generic };
  revalidatePath("/courses");
  return { ok: true };
}

export async function setItemChecked(id: string, checked: boolean): Promise<ActionResult> {
  const c = await client();
  if (!c || !uuid.safeParse(id).success) return { error: t.errors.generic };
  const { error } = await c.supabase.from("shopping_items").update({ checked }).eq("id", id);
  return done(error);
}

export async function removeItem(id: string): Promise<ActionResult> {
  const c = await client();
  if (!c || !uuid.safeParse(id).success) return { error: t.errors.generic };
  const { error } = await c.supabase.from("shopping_items").delete().eq("id", id);
  return done(error);
}

/** A typed line ("1 litre de lait"), parsed like an ingredient and put in its aisle. */
export async function addItem(text: string): Promise<ActionResult> {
  const c = await client();
  const line = text.trim().slice(0, 120);
  if (!c || !line) return { error: t.errors.generic };
  const parsed = parseIngredientLine(line);
  const name = parsed.name || line;
  const key = guessIngredientKey(name);
  const { error } = await c.supabase.from("shopping_items").insert({
    user_id: c.userId,
    name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    ingredient_key: key,
    aisle: aisleOf({ name, ingredient_key: key, aisle: null }),
  });
  return done(error);
}

export async function clearItems(onlyChecked: boolean): Promise<ActionResult> {
  const c = await client();
  if (!c) return { error: t.errors.generic };
  let query = c.supabase.from("shopping_items").delete().eq("user_id", c.userId);
  if (onlyChecked) query = query.eq("checked", true);
  const { error } = await query;
  return done(error);
}

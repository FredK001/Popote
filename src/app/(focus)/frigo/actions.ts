"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { matchFridge, type FridgeMatch, type FridgeRecipe } from "@/lib/fridge";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

const items = z.array(z.string().trim().min(2).max(60)).min(1).max(30);

/** "Frigo vide": the user's and friends' recipes that use what they have. */
export async function findFromFridge(have: string[]): Promise<{ error?: string; matches?: FridgeMatch[] }> {
  const userId = await getUserId();
  const parsed = items.safeParse(have);
  if (!userId || !parsed.success) return { error: t.errors.generic };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fridge_recipes");
  if (error) return { error: t.errors.generic };
  return { matches: matchFridge(parsed.data, (data ?? []) as FridgeRecipe[], 12) };
}

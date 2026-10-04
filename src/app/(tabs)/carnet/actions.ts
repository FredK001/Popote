"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { PROFILE_COLORS } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

export type CategoryState = { error?: string; createdId?: string };

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  color_token: z.enum(PROFILE_COLORS as [string, ...string[]]),
});

export async function createCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const userId = await getUserId();
  if (!userId) return { error: t.errors.generic };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.recipeForm.errorInvalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: parsed.data.name, color_token: parsed.data.color_token, icon_key: "c-tout", position: 100 })
    .select("id")
    .single();
  if (error) return { error: t.errors.generic };

  revalidatePath("/carnet");
  return { createdId: data.id };
}

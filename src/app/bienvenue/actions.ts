"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { PROFILE_COLORS } from "@/lib/colors";
import { safeNext } from "@/lib/safe-redirect";
import { publicFileUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

export type NotebookSettingsState = { error?: string };

const colorEnum = z.enum(PROFILE_COLORS as [string, ...string[]]);

const settingsSchema = z.object({
  first_name: z.string().trim().min(1).max(50),
  notebook_name: z.string().trim().min(1).max(60),
  notebook_color: colorEnum,
  avatar_color: colorEnum,
  // Either a new upload (path in the user's folder) or the URL kept as is.
  avatar_path: z.string().max(300).optional(),
  avatar_url: z.string().max(2000).optional(),
});

/** Saves onboarding (and later profile edits) then goes to the notebook. */
export async function saveNotebookSettings(
  _prev: NotebookSettingsState,
  formData: FormData,
): Promise<NotebookSettingsState> {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.recipeForm.errorInvalid };
  const data = parsed.data;

  let avatarUrl: string | null = data.avatar_url || null;
  if (data.avatar_path) {
    // Only accept files from the user's own folder.
    if (!data.avatar_path.startsWith(`${userId}/`)) return { error: t.recipeForm.errorInvalid };
    avatarUrl = publicFileUrl("avatars", data.avatar_path);
  }

  const supabase = await createClient();
  const { data: current } = await supabase.from("profiles").select("onboarded_at").eq("id", userId).single();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.first_name,
      notebook_name: data.notebook_name,
      notebook_color: data.notebook_color,
      avatar_color: data.avatar_color,
      avatar_url: avatarUrl,
      onboarded_at: current?.onboarded_at ?? new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: t.errors.generic };

  revalidatePath("/", "layout");
  redirect(safeNext(String(formData.get("next") ?? "")));
}

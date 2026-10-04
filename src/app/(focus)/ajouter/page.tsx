import type { Metadata } from "next";
import { AddRecipeFlow } from "@/components/add/AddRecipeFlow";
import { getAiProvider } from "@/lib/ai/server";
import { requireProfile } from "@/lib/auth";
import { getCategories } from "@/lib/recipes/queries";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.add.title };

export default async function AddPage() {
  const profile = await requireProfile();
  const [categories, provider] = await Promise.all([getCategories(), getAiProvider(profile.id)]);
  return <AddRecipeFlow userId={profile.id} categories={categories} hasAi={provider !== null} />;
}

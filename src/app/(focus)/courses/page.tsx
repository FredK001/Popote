import type { Metadata } from "next";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { ShoppingList } from "@/components/shopping/ShoppingList";
import { requireProfile } from "@/lib/auth";
import type { ShoppingItem } from "@/lib/shopping";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.shopping.title };

export default async function ShoppingPage() {
  const supabase = await createClient();
  const [, { data }] = await Promise.all([
    requireProfile(),
    supabase.from("shopping_items").select("id, recipe_id, name, quantity, unit, ingredient_key, aisle, checked").order("created_at"),
  ]);
  return (
    <main>
      <FocusHeader title={t.shopping.title} backHref="/carnet" />
      <ShoppingList items={(data ?? []) as ShoppingItem[]} />
    </main>
  );
}

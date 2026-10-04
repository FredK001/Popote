import type { PictoId } from "@/components/ui/Icon";
import type { Category } from "@/lib/recipes/types";
import { t } from "@/messages";

/** Display name: default categories are translated, custom ones use their name. */
export function categoryLabel(category: Pick<Category, "default_key" | "name">): string {
  if (category.default_key) return t.notebook.categories[category.default_key] ?? category.default_key;
  return category.name ?? "";
}

export function categoryPicto(category: Pick<Category, "icon_key">): PictoId {
  return (category.icon_key.startsWith("c-") ? category.icon_key : "c-tout") as PictoId;
}

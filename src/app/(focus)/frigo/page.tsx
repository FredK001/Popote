import type { Metadata } from "next";
import { FridgeSearch } from "@/components/fridge/FridgeSearch";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { requireProfile } from "@/lib/auth";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.fridge.title };

export default async function FridgePage() {
  await requireProfile();
  return (
    <main>
      <FocusHeader title={t.fridge.title} backHref="/carnet" />
      <FridgeSearch />
    </main>
  );
}

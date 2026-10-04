import type { Metadata } from "next";
import { signOut } from "@/app/connexion/actions";
import { NotebookSettingsForm } from "@/components/notebook/NotebookSettingsForm";
import { Button } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.profile.title };

export default async function ProfilePage() {
  const profile = await requireProfile();
  return (
    <main className="px-gutter pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-title text-display">{t.profile.title}</h1>
      <h2 className="mt-6 mb-4 text-h2">{t.profile.notebook}</h2>
      <NotebookSettingsForm profile={profile} next="/carnet" submitLabel={t.recipe.save} />
      <form action={signOut} className="mt-10">
        <Button type="submit" variant="secondary" block>
          {t.auth.signOut}
        </Button>
      </form>
    </main>
  );
}

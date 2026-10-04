import type { Metadata } from "next";
import Link from "next/link";
import { NotebookSettingsForm } from "@/components/notebook/NotebookSettingsForm";
import { InstallEntry } from "@/components/pwa/InstallEntry";
import { NotificationsSettings } from "@/components/pwa/NotificationsSettings";
import { SignOutButton } from "@/components/pwa/SignOutButton";
import { Icon } from "@/components/ui/Icon";
import { requireProfile } from "@/lib/auth";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.profile.title };

export default async function ProfilePage() {
  const profile = await requireProfile();
  return (
    <main className="px-gutter pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="font-title text-display">{t.profile.title}</h1>

      <div className="mt-6 space-y-3">
        <InstallEntry />
        <Link href="/profil/ia" className="flex min-h-tap items-center gap-3 rounded-card bg-surface p-4 font-bold">
          <Icon name="camera" />
          <span className="flex-1">{t.aiSettings.settingsTitle}</span>
          <Icon name="back" className="rotate-180" />
        </Link>
      </div>

      <div className="mt-6">
        <NotificationsSettings />
      </div>

      <h2 className="mt-8 mb-4 text-h2">{t.profile.notebook}</h2>
      <NotebookSettingsForm profile={profile} next="/carnet" submitLabel={t.recipe.save} />

      <div className="mt-10">
        <SignOutButton />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotebookSettingsForm } from "@/components/notebook/NotebookSettingsForm";
import { Logo } from "@/components/ui/Logo";
import { getProfile } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";
import { format, t } from "@/messages";

export const metadata: Metadata = { title: t.onboarding.titleNoName };

export default async function WelcomePage({ searchParams }: PageProps<"/bienvenue">) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?next=/bienvenue");

  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  if (profile.onboarded_at) redirect(next);

  return (
    <main className="mx-auto max-w-[430px] px-gutter pt-6 pb-12">
      <Logo />
      <h1 className="mt-8 font-title text-display">
        {profile.first_name ? format(t.onboarding.title, { name: profile.first_name }) : t.onboarding.titleNoName}
      </h1>
      <p className="mt-2 mb-6 text-encre-2">{t.onboarding.lead}</p>
      <NotebookSettingsForm profile={profile} next={next} submitLabel={t.onboarding.submit} />
    </main>
  );
}

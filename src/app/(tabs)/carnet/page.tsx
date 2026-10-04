import type { Metadata } from "next";
import { NotebookCover } from "@/components/notebook/NotebookCover";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { requireProfile } from "@/lib/auth";
import { getCategories, getNotebook } from "@/lib/recipes/queries";
import { format, t } from "@/messages";
import { EmptyNotebook, NotebookView } from "./NotebookView";

export const metadata: Metadata = { title: t.nav.notebook };

export default async function NotebookPage() {
  // One parallel round trip (the database is far from the server).
  const [profile, items, categories] = await Promise.all([requireProfile(), getNotebook(), getCategories()]);

  const subtitle =
    items.length === 0
      ? t.notebook.brandNew
      : items.length === 1
        ? t.notebook.countOne
        : format(t.notebook.count, { n: items.length });

  return (
    <main>
      <header className="flex items-center justify-between px-gutter pt-[max(1rem,env(safe-area-inset-top))]">
        <Logo />
      </header>

      <div className="mt-3.5 px-gutter">
        <h1 className="sr-only">{profile.notebook_name}</h1>
        <NotebookCover
          color={profile.notebook_color}
          title={profile.notebook_name ?? format(t.onboarding.notebookDefault, { name: profile.first_name })}
          subtitle={subtitle}
          corner={<Avatar name={profile.first_name} tone={profile.avatar_color} size="l" photoUrl={profile.avatar_url} />}
        />
      </div>

      {items.length === 0 ? (
        <EmptyNotebook />
      ) : (
        <NotebookView items={items} categories={categories} userId={profile.id} />
      )}
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { getProfile } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";
import { tokenFromClaimPath } from "@/lib/share-token";
import { getPublicShare } from "@/lib/shares";
import { format, t } from "@/messages";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: t.auth.title };

const ERRORS: Record<string, string> = {
  lien: t.auth.errorLink,
  google: t.auth.errorGoogle,
};

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const errorKey = typeof params.erreur === "string" ? params.erreur : null;

  // Already signed in: go straight on.
  if (await getProfile()) redirect(next);

  // Coming from "Ajouter à mon carnet": remind what is waiting.
  const claimToken = tokenFromClaimPath(next);
  const share = claimToken ? await getPublicShare(claimToken) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-gutter pt-6 pb-10">
      <Logo />
      {share && (
        <p className="mt-8 rounded-card bg-laiton-soft p-4 font-semibold text-laiton-ink">
          {format(t.publicRecipe.loginContext, { name: share.sender.firstName, title: share.recipe.title })}
        </p>
      )}
      <div className={share ? "mt-6" : "mt-12"}>
        <LoginForm next={next} initialError={errorKey ? ERRORS[errorKey] : undefined} />
      </div>
    </main>
  );
}

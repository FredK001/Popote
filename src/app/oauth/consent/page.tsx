import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { format, t } from "@/messages";
import { approve, deny } from "./actions";

export const metadata: Metadata = { title: t.consent.titleUnknown, robots: { index: false } };

const c = t.consent;

/**
 * OAuth 2.1 consent page for the Supabase Auth OAuth server ("Authorization path"
 * setting: /oauth/consent). Claude or ChatGPT send the user here when they add the
 * Popote connector; the user signs in to Popote if needed, then allows or denies.
 */
export default async function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  const params = await searchParams;
  const authorizationId = typeof params.authorization_id === "string" ? params.authorization_id : null;
  if (!authorizationId) return <Expired />;

  const here = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
  const profile = await getProfile();
  if (!profile) redirect(`/connexion?next=${encodeURIComponent(here)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) return <Expired />;
  // Already allowed earlier: go straight back to the client.
  if ("redirect_url" in data) redirect(data.redirect_url);

  const client = data.client.name?.trim();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-gutter pt-6 pb-10">
      <Logo />
      <h1 className="mt-10 font-title text-h1">{client ? format(c.title, { client }) : c.titleUnknown}</h1>
      {params.erreur && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-card bg-erreur-soft p-3 text-small font-semibold text-erreur">
          <Icon name="alert" size={20} />
          {t.errors.generic}
        </p>
      )}
      <p className="mt-4 text-encre-2">{format(c.lead, { client: client || c.thisApp })}</p>
      <ul className="mt-3 space-y-2">
        {c.can.map((line) => (
          <li key={line} className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-pill bg-sauge-soft text-sauge-ink">
              <Icon name="check" size={16} strokeWidth={2.6} />
            </span>
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-small text-encre-3">{c.cannot}</p>

      <p className="mt-6 flex items-center gap-2.5 text-small text-encre-2">
        <Avatar name={profile.first_name || "?"} tone={profile.avatar_color} size="s" photoUrl={profile.avatar_url} />
        {format(c.account, { email: data.user.email })}
      </p>

      <div className="mt-auto space-y-3 pt-8">
        <form action={approve}>
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <Button type="submit" block icon="check">
            {c.allow}
          </Button>
        </form>
        <form action={deny}>
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <Button type="submit" variant="secondary" block>
            {c.deny}
          </Button>
        </form>
      </div>
    </main>
  );
}

function Expired() {
  return (
    <main className="mx-auto max-w-[430px] px-gutter pt-6">
      <Logo />
      <EmptyState icon="lock" title={t.consent.titleUnknown} lead={t.consent.expired} />
    </main>
  );
}

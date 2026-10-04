import type { Metadata } from "next";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { Icon } from "@/components/ui/Icon";
import { fakeAiEnabled } from "@/lib/ai/server";
import { requireProfile } from "@/lib/auth";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.aiSettings.settingsTitle };

const s = t.aiSettings;

/**
 * "Brancher mon IA": ChatGPT (sign-in button, hidden until OpenAI grants access)
 * and Claude (MCP connector guide, phase 3b). Popote stores no API key.
 */
export default async function AiSettingsPage() {
  await requireProfile();
  return (
    <main className="pb-10">
      <FocusHeader title={s.settingsTitle} backHref="/profil" />
      <div className="space-y-4 px-gutter">
        <p className="text-encre-2">{s.settingsLead}</p>

        {fakeAiEnabled() && (
          <p className="flex items-center gap-2 rounded-card bg-succes-soft p-4 font-semibold text-succes">
            <Icon name="check" />
            {s.fakeConnected}
          </p>
        )}

        <section className="rounded-block border border-trait bg-surface p-5">
          <h2 className="text-h2">{s.chatgpt}</h2>
          <p className="mt-2 text-encre-2">{s.chatgptLead}</p>
          <p className="mt-3 inline-flex rounded-pill bg-fond-2 px-3 py-1 text-small font-semibold text-encre-2">{s.chatgptSoon}</p>
        </section>

        <section className="rounded-block border border-trait bg-surface p-5">
          <h2 className="text-h2">{s.claude}</h2>
          <p className="mt-2 text-encre-2">{s.claudeLead}</p>
          <p className="mt-3 inline-flex rounded-pill bg-fond-2 px-3 py-1 text-small font-semibold text-encre-2">{s.claudeSoon}</p>
        </section>
      </div>
    </main>
  );
}

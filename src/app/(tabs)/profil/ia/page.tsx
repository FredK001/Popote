import type { Metadata } from "next";
import { CopyField } from "@/components/notebook/CopyField";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { Icon } from "@/components/ui/Icon";
import { fakeAiEnabled } from "@/lib/ai/server";
import { requireProfile } from "@/lib/auth";
import { siteOrigin } from "@/lib/site-url";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.aiSettings.settingsTitle };

const s = t.aiSettings;

function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, i) => (
        <li key={step} className="grid grid-cols-[2rem_1fr] gap-3">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[10px] bg-tomate-soft font-bold text-tomate-dark">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * "Brancher mon IA": Claude through the Popote MCP connector (step-by-step guide and
 * the URL to copy), ChatGPT sign-in announced (hidden until OpenAI grants access).
 * Popote stores no API key.
 */
export default async function AiSettingsPage() {
  await requireProfile();
  const connectorUrl = `${await siteOrigin()}/mcp`;

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

        <section className="rounded-block border border-trait bg-surface p-5" aria-labelledby="claude-title">
          <h2 id="claude-title" className="text-h2">
            {s.claude}
          </h2>
          <p className="mt-2 text-encre-2">{s.claudeLead}</p>
          <div className="mt-4">
            <CopyField label={s.connectorUrl} value={connectorUrl} copyLabel={s.copy} copiedLabel={s.copied} />
          </div>
          <Steps steps={s.claudeSteps} />
          <p className="mt-4 text-caption text-encre-3">{s.screenshotsLater}</p>
        </section>

        <section className="rounded-block border border-trait bg-surface p-5" aria-labelledby="chatgpt-title">
          <h2 id="chatgpt-title" className="text-h2">
            {s.chatgpt}
          </h2>
          <p className="mt-2 text-encre-2">{s.chatgptLead}</p>
          <p className="mt-3 inline-flex rounded-pill bg-fond-2 px-3 py-1 text-small font-semibold text-encre-2">{s.chatgptSoon}</p>
          <h3 className="mt-5 text-h3">{s.chatgptConnector}</h3>
          <Steps steps={s.chatgptSteps} />
        </section>
      </div>
    </main>
  );
}

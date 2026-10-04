"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { bannerDismissed, dismissBanner, installPlatform, onInstallChange, promptInstall, type InstallPlatform } from "@/lib/pwa";
import { t } from "@/messages";

const i = t.install;

/** Current install situation, updated when Chrome offers installation. */
export function useInstallPlatform(): InstallPlatform | null {
  return useSyncExternalStore(onInstallChange, installPlatform, () => null);
}

/** Two illustrated steps for iPhone Safari (no install prompt exists there). */
export function IosInstallSheet({ open, onClose, lead }: { open: boolean; onClose: () => void; lead?: string }) {
  const platform = useInstallPlatform();
  return (
    <Sheet open={open} onClose={onClose} title={i.iosTitle}>
      {lead && <p className="mb-4 text-encre-2">{lead}</p>}
      {platform === "ios-other" ? (
        <p className="rounded-card bg-ciel-soft p-4 text-bleu-nuit">{i.iosNotSafari}</p>
      ) : (
        <ol className="space-y-4">
          <li className="flex items-center gap-4 rounded-card bg-surface p-4">
            <span className="flex size-12 flex-none items-center justify-center rounded-card bg-ciel-soft text-bleu-nuit">
              <Icon name="share" size={26} />
            </span>
            <span>
              <b className="block text-small text-encre-3">1</b>
              {i.iosStep1}
            </span>
          </li>
          <li className="flex items-center gap-4 rounded-card bg-surface p-4">
            <span className="flex size-12 flex-none items-center justify-center rounded-card bg-ciel-soft text-bleu-nuit">
              <span className="flex size-7 items-center justify-center rounded-[7px] border-2 border-current">
                <Icon name="plus" size={16} strokeWidth={2.4} />
              </span>
            </span>
            <span>
              <b className="block text-small text-encre-3">2</b>
              {i.iosStep2}
            </span>
          </li>
        </ol>
      )}
      <p className="mt-4 text-small text-encre-2">{i.iosNote}</p>
      <Button variant="secondary" block className="mt-5" onClick={onClose}>
        {i.close}
      </Button>
    </Sheet>
  );
}

/**
 * Discreet banner for signed-in users still in the browser. Android/Chrome: our own
 * button triggers the native prompt. iPhone: opens the two-step guide.
 * Once closed, it stays away for 14 days.
 */
export function InstallBanner() {
  const platform = useInstallPlatform();
  const [hidden, setHidden] = useState(true);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    // Reading localStorage must wait for the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(bannerDismissed());
  }, []);

  const relevant = platform === "android-prompt" || platform === "ios-safari" || platform === "ios-other";
  if (hidden || !relevant) return null;

  const close = () => {
    dismissBanner();
    setHidden(true);
  };

  return (
    <>
      <aside
        aria-label={i.bannerTitle}
        className="fixed inset-x-3 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+0.75rem)] z-30 mx-auto flex max-w-[406px] items-center gap-3 rounded-card bg-encre p-3 pl-4 text-blanc"
      >
        <span className="min-w-0 flex-1">
          <b className="block">{i.bannerTitle}</b>
          <span className="block text-small">{i.bannerLead}</span>
        </span>
        <button
          type="button"
          className="min-h-tap rounded-pill bg-blanc px-4 font-bold text-encre"
          onClick={async () => {
            if (platform === "android-prompt") {
              if (await promptInstall()) setHidden(true);
            } else setGuide(true);
          }}
        >
          {platform === "android-prompt" ? i.install : i.how}
        </button>
        <button type="button" aria-label={i.later} onClick={close} className="tap-target flex size-8 items-center justify-center rounded-pill">
          <Icon name="x" size={18} />
        </button>
      </aside>
      <IosInstallSheet open={guide} onClose={() => setGuide(false)} />
    </>
  );
}

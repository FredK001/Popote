"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/(tabs)/profil/push-actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { t } from "@/messages";
import { IosInstallSheet, useInstallPlatform } from "./InstallGuide";

const n = t.notifications;

type State = "loading" | "unsupported" | "ios-install-first" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Turns Web Push on/off for this device. On iPhone it only works in the installed
 * app (iOS 16.4+): we say so instead of showing a button that would not work.
 */
export function NotificationsSettings() {
  const platform = useInstallPlatform();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    async function detect() {
      if (platform === null) return;
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(platform === "ios-safari" || platform === "ios-other" ? "ios-install-first" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    }
    void detect();
  }, [platform]);

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
      });
      const result = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!result.ok) throw new Error("save failed");
      setState("on");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  return (
    <section className="rounded-block border border-trait bg-surface p-5" aria-labelledby="notif-title">
      <h2 id="notif-title" className="flex items-center gap-2 text-h2">
        <Icon name="bell" />
        {n.title}
      </h2>
      <p className="mt-2 text-encre-2">{n.lead}</p>

      {state === "on" && (
        <>
          <p className="mt-4 flex items-center gap-2 font-semibold text-succes">
            <Icon name="check" />
            {n.enabled}
          </p>
          <Button variant="text" className="mt-2" disabled={busy} onClick={disable}>
            {n.disable}
          </Button>
        </>
      )}
      {state === "off" && (
        <Button icon="bell" block className="mt-4" disabled={busy} onClick={enable}>
          {busy ? n.enabling : n.enable}
        </Button>
      )}
      {state === "ios-install-first" && (
        <>
          <p className="mt-4 rounded-card bg-ciel-soft p-4 text-small text-bleu-nuit">{n.iosInstallFirst}</p>
          <Button variant="secondary" block className="mt-3" onClick={() => setGuide(true)}>
            {t.install.how}
          </Button>
          <IosInstallSheet open={guide} onClose={() => setGuide(false)} />
        </>
      )}
      {state === "denied" && <p className="mt-4 rounded-card bg-alerte-soft p-4 text-small text-alerte-ink">{n.denied}</p>}
      {state === "unsupported" && <p className="mt-4 text-small text-encre-3">{n.unsupported}</p>}
      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {n.error}
        </p>
      )}
    </section>
  );
}

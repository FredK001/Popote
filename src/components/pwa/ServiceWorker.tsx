"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { captureInstallPrompt } from "@/lib/pwa";
import { t } from "@/messages";

/** Registers /sw.js (production only) and shows a discreet offline strip. */
export function ServiceWorker() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    captureInstallPrompt();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <p
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-encre px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-small font-semibold text-blanc"
    >
      <Icon name="alert" size={16} />
      {t.offline.banner}
    </p>
  );
}

/** Forgets the personal pages and photos kept offline (on sign-out). */
export function clearUserCache() {
  navigator.serviceWorker?.controller?.postMessage({ type: "clear-user-cache" });
}

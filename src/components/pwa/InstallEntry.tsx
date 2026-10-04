"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { promptInstall } from "@/lib/pwa";
import { t } from "@/messages";
import { IosInstallSheet, useInstallPlatform } from "./InstallGuide";

/** "Installer l'appli" in the profile, hidden once installed. */
export function InstallEntry() {
  const platform = useInstallPlatform();
  const [guide, setGuide] = useState(false);
  if (!platform || platform === "installed" || platform === "other") return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (platform === "android-prompt" ? void promptInstall() : setGuide(true))}
        className="flex min-h-tap w-full items-center gap-3 rounded-card bg-surface p-4 text-left font-bold"
      >
        <Icon name="plus" />
        <span className="flex-1">{t.install.profileEntry}</span>
        <Icon name="back" className="rotate-180" />
      </button>
      <IosInstallSheet open={guide} onClose={() => setGuide(false)} />
    </>
  );
}

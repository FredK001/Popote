"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Read-only value with a one-tap copy button. */
export function CopyField({ label, value, copyLabel, copiedLabel }: { label: string; value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <span className="mb-2 block text-small font-semibold text-encre-2">{label}</span>
      <code className="block rounded-card border border-trait bg-fond px-3 py-3 text-small break-all select-all">{value}</code>
      <Button
        variant="secondary"
        icon={copied ? "check" : "link"}
        block
        className="mt-2"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
          } catch {
            // Clipboard refused: the value stays selectable by hand.
          }
        }}
      >
        <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
      </Button>
    </div>
  );
}

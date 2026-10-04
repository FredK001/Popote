"use client";

import { useState, useTransition } from "react";
import { createShare } from "@/app/(focus)/recette/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { format, t } from "@/messages";

type Props = {
  open: boolean;
  onClose: () => void;
  onShared: (copied: boolean) => void;
  recipeId: string;
  title: string;
  senderName: string;
};

/**
 * Optional message, then a link created server-side. Uses the native share sheet
 * (WhatsApp, Messages…) when available, otherwise copies the link.
 */
export function ShareSheet({ open, onClose, onShared, recipeId, title, senderName }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function deliver(url: string) {
    const text = message.trim() || format(t.share.shareText, { name: senderName, title });
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        onShared(false);
        return;
      } catch (e) {
        // Cancelled by the user: keep the sheet open so they can copy instead.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      onShared(true);
    } catch {
      // Clipboard refused: show the link so it can be copied by hand.
    }
  }

  function send() {
    setError(null);
    startTransition(async () => {
      const result = link ? { url: link } : await createShare(recipeId, message);
      if (!result.url) return setError(result.error ?? t.share.error);
      setLink(result.url);
      await deliver(result.url);
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.share.title}>
      <p className="mb-4 text-small text-encre-2">{t.share.lead}</p>
      <label className="block">
        <span className="mb-2 block text-small font-semibold text-encre-2">{t.share.message}</span>
        <textarea
          rows={3}
          maxLength={500}
          value={message}
          disabled={Boolean(link)}
          placeholder={t.share.messagePlaceholder}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-card border-[1.5px] border-trait bg-surface px-4 py-3 placeholder:text-encre-3 focus:border-encre disabled:text-encre-2"
        />
      </label>
      {link && (
        <p className="mt-3 rounded-card bg-surface p-3 text-small break-all text-encre-2 select-all">{link}</p>
      )}
      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
      <Button icon="share" block className="mt-4" disabled={pending} onClick={send}>
        {pending ? t.share.creating : link ? t.share.copy : t.share.send}
      </Button>
    </Sheet>
  );
}

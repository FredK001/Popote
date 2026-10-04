"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { extensionFor, resizeImage } from "@/lib/image-resize";
import type { Bucket } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type PhotoUploadProps = {
  bucket: Bucket;
  userId: string;
  /** Longest side after resize. */
  maxSide?: number;
  onUploaded: (path: string) => void;
  label: string;
  busyLabel: string;
  errorLabel: string;
  className?: string;
  children?: ReactNode;
};

/**
 * File picker that resizes in the browser (WebP, ≤ maxSide) and uploads to
 * {bucket}/{userId}/{random}.webp. Storage policies only allow the user's own folder.
 */
export function PhotoUpload({
  bucket, userId, maxSide = 1600, onUploaded, label, busyLabel, errorLabel, className, children,
}: PhotoUploadProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const blob = await resizeImage(file, maxSide);
      const path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`;
      const { error: uploadError } = await createClient()
        .storage.from(bucket)
        .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      onUploaded(path);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={cx(
          "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-pill border-[1.5px] border-encre bg-surface px-5 font-bold",
          "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bleu-nuit",
          busy && "cursor-wait opacity-70",
        )}
      >
        <Icon name="camera" />
        {busy ? busyLabel : label}
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {errorLabel}
        </p>
      )}
    </div>
  );
}

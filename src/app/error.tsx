"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { t } from "@/messages";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[430px]">
      <EmptyState icon="alert" title={t.errors.generic}>
        <Button icon="refresh" onClick={reset}>
          {t.common.retry}
        </Button>
      </EmptyState>
    </main>
  );
}

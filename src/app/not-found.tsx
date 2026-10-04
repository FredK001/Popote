import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { t } from "@/messages";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[430px]">
      <EmptyState icon="search" title={t.errors.notFound}>
        <Link href="/carnet" className={buttonClasses("primary")}>
          {t.errors.backHome}
        </Link>
      </EmptyState>
    </main>
  );
}

import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { APP_NAME } from "@/lib/config";
import { t } from "@/messages";

// Placeholder home until phase 1 (notebook).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col justify-center gap-6 px-gutter">
      <h1 className="font-title text-display">{APP_NAME}</h1>
      <p className="text-encre-2">{t.meta.description}</p>
      <Link href="/design-system" className={buttonClasses("secondary")}>
        {t.designSystem.title}
      </Link>
    </main>
  );
}

import { t } from "@/messages";

/** Notebook skeleton: cover, search and list placeholders, shown instantly. */
export default function NotebookLoading() {
  return (
    <main aria-busy="true">
      <span className="sr-only">{t.common.loading}</span>
      <div className="px-gutter pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="h-7 w-28 rounded-tag bg-fond-2" />
        <div className="mt-3.5 h-42 rounded-block bg-fond-2" />
        <div className="mt-4.5 h-13 rounded-card bg-surface" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mt-4 flex items-center gap-3.5">
            <div className="size-16 rounded-card bg-fond-2" />
            <div className="h-5 flex-1 rounded-tag bg-fond-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

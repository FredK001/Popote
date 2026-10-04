import { t } from "@/messages";

/**
 * Shown instantly when a recipe is tapped (and prefetched from the notebook), while
 * the data arrives: same layout as the sheet, flat placeholder blocks, no animation.
 */
export default function RecipeLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <span className="sr-only">{t.common.loading}</span>
      <div className="h-82.5 bg-fond-2" />
      <div className="relative -mt-7 rounded-t-[28px] bg-fond px-gutter pt-6">
        <div className="h-7 w-24 rounded-tag bg-fond-2" />
        <div className="mt-3 h-9 w-11/12 rounded-tag bg-fond-2" />
        <div className="mt-2 h-9 w-2/3 rounded-tag bg-fond-2" />
        <div className="mt-5 grid grid-cols-[1fr_1fr_1.3fr] gap-2">
          <div className="h-16 rounded-card bg-abricot-soft" />
          <div className="h-16 rounded-card bg-sauge-soft" />
          <div className="h-16 rounded-card bg-laiton-soft" />
        </div>
        <div className="mt-8 h-6 w-32 rounded-tag bg-fond-2" />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-34 rounded-[20px] bg-surface" />
          ))}
        </div>
      </div>
    </main>
  );
}

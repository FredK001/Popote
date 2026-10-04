import { cx } from "@/lib/cx";
import { Icon, Picto, type PictoId } from "./Icon";

export type SoftTone = "laiton" | "tomate" | "ciel" | "prune" | "abricot" | "sauge";

const tints: Record<SoftTone, string> = {
  laiton: "bg-laiton-soft",
  tomate: "bg-tomate-soft",
  ciel: "bg-ciel-soft",
  prune: "bg-prune-soft",
  abricot: "bg-abricot-soft",
  sauge: "bg-sauge-soft",
};

type IngredientTileProps = {
  picto: PictoId;
  tint: SoftTone;
  quantity: string;
  name: string;
  /** "Ma version": the user's own quantity, shown next to the struck-through original. */
  myQuantity?: string;
  /** Increment to replay the bounce after a recalculation. */
  bump?: number;
  /** When set, the tile is a checkbox. */
  checked?: boolean;
  onToggle?: () => void;
  checkLabel?: string;
};

export function IngredientTile({
  picto, tint, quantity, name, myQuantity, bump = 0, checked, onToggle, checkLabel,
}: IngredientTileProps) {
  const checkable = onToggle !== undefined;
  const done = checkable && checked;
  const qtyAnim = bump > 0 ? "animate-bump" : undefined;

  const content = (
    <>
      {checkable && (
        <span
          className={cx(
            "absolute right-3 top-3 flex size-7 items-center justify-center rounded-pill border-2",
            done ? "animate-pop border-sauge bg-sauge text-blanc" : "border-encre-3 bg-surface text-transparent",
          )}
        >
          <Icon name="check" size={16} strokeWidth={3} />
        </span>
      )}
      <span
        className={cx(
          "flex size-14 items-center justify-center rounded-[18px] transition-transform duration-250",
          tints[tint],
          done && "-rotate-12 scale-90",
        )}
      >
        <Picto id={picto} width={38} />
      </span>
      <span className={cx("mt-auto flex flex-wrap items-center gap-2")}>
        {myQuantity ? (
          <>
            <span key={`q${bump}`} className={cx("inline-block font-title text-h3 font-extrabold text-encre-3 line-through decoration-2", qtyAnim)}>
              {quantity}
            </span>
            <span key={`m${bump}`} className={cx("inline-block rounded-pill bg-laiton px-2.5 py-0.5 text-small font-bold text-blanc", qtyAnim)}>
              {myQuantity}
            </span>
          </>
        ) : (
          <span key={`q${bump}`} className={cx("inline-block font-title text-qty", qtyAnim)}>
            {quantity}
          </span>
        )}
      </span>
      <span className={"text-small font-medium text-encre-2"}>{name}</span>
    </>
  );

  const tileClass = cx(
    "relative flex min-h-34 w-full flex-col gap-2.5 rounded-[20px] p-3 pb-3.5 text-left transition-[transform,background-color] duration-200",
    done ? "bg-sauge-soft" : "bg-surface",
  );

  if (!checkable) return <div className={tileClass}>{content}</div>;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={checkLabel}
      onClick={onToggle}
      className={cx(tileClass, "active:scale-[.96]")}
    >
      {content}
    </button>
  );
}

/** "Mise en place" progress bar, fills as ingredients get ticked. */
export function MiseEnPlace({ done, total, label, count }: { done: number; total: number; label: string; count: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface px-3.5 py-3">
      <span className="whitespace-nowrap text-small font-bold">
        {label} <span className="text-sauge-ink">{count}</span>
      </span>
      <span className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label}>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={cx("h-2 flex-1 rounded-tag transition-colors duration-200", i < done ? "bg-sauge" : "bg-fond-2")} />
        ))}
      </span>
    </div>
  );
}

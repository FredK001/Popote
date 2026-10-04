import { cx } from "@/lib/cx";
import { Icon, Picto } from "./Icon";

const FALLING = [
  { id: "p-tomate", left: "33%", width: 34, height: 34, delay: "0s" },
  { id: "p-feuille", left: "46%", width: 30, height: 30, delay: ".6s" },
  { id: "p-carotte", left: "58%", width: 24, height: 40, delay: "1.2s" },
  { id: "p-fromage", left: "41%", width: 30, height: 30, delay: "1.8s" },
] as const;

const STEAM = [
  { left: "calc(50% - 26px)", delay: "0s" },
  { left: "calc(50% - 4px)", delay: ".6s" },
  { left: "calc(50% + 18px)", delay: "1.2s" },
];

/** Animated pot during AI processing: the only animation that starts without a user action. */
export function PotLoader() {
  return (
    <div aria-hidden="true" className="relative h-75 overflow-hidden rounded-block bg-abricot-soft">
      {FALLING.map((ing) => (
        <span key={ing.id} className="absolute top-0 animate-drop opacity-0" style={{ left: ing.left, animationDelay: ing.delay }}>
          <Picto id={ing.id} width={ing.width} height={ing.height} />
        </span>
      ))}
      {STEAM.map((s) => (
        <span
          key={s.left}
          className="absolute bottom-37.5 h-11 w-2.5 animate-steam rounded-tag bg-blanc opacity-0"
          style={{ left: s.left, animationDelay: s.delay }}
        />
      ))}
      <span className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <Picto id="ill-marmite" width={180} height={120} />
      </span>
    </div>
  );
}

export type StepState = "done" | "current" | "todo";

/** Three-step progress shown under the pot. */
export function ProgressSteps({ steps }: { steps: Array<{ label: string; state: StepState }> }) {
  return (
    <ol className="mt-6 space-y-0">
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cx("flex items-center gap-3 py-2 font-medium", step.state === "todo" && "text-encre-3")}
        >
          {step.state === "done" && (
            <span className="flex size-6.5 items-center justify-center rounded-pill bg-sauge text-blanc">
              <Icon name="check" size={15} strokeWidth={3} />
            </span>
          )}
          {step.state === "current" && (
            <span className="size-6.5 animate-spin rounded-pill border-3 border-trait border-t-tomate" />
          )}
          {step.state === "todo" && <span className="size-6.5 rounded-pill border-2 border-dashed border-trait" />}
          {step.label}
        </li>
      ))}
    </ol>
  );
}

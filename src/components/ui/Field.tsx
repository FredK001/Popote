import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  icon?: IconName;
  error?: string;
};

export function Field({ label, hideLabel, icon, error, className, id, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className={cx("mb-2 block text-small font-semibold text-encre-2", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        className={cx(
          "flex h-13 items-center gap-2.5 rounded-card border-[1.5px] bg-surface px-4 text-encre-3",
          "focus-within:border-encre focus-within:text-encre focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-bleu-nuit",
          error ? "border-erreur" : "border-trait",
        )}
      >
        {icon && <Icon name={icon} />}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-encre outline-none placeholder:text-encre-3"
          {...rest}
        />
      </div>
      {error && (
        // Error red is close to the brand red: always paired with an icon and a message.
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}

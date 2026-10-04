import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "brass" | "text" | "added";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-tomate text-blanc hover:bg-tomate-dark",
  secondary: "bg-surface text-encre border-[1.5px] border-encre",
  // Text on brass is always white.
  brass: "bg-laiton text-blanc",
  text: "text-tomate-dark px-3",
  added: "bg-sauge-soft text-sauge-ink",
};

const base =
  "inline-flex items-center justify-center gap-2 min-h-13 px-5 rounded-pill font-bold text-body " +
  "transition-[transform,background-color] duration-150 active:scale-[.97] " +
  "disabled:bg-fond-2 disabled:text-encre-3 disabled:border-0 disabled:cursor-not-allowed disabled:active:scale-100";

/** Shared class list, also used by links styled as buttons. */
export function buttonClasses(variant: ButtonVariant = "primary", block = false, className?: string) {
  return cx(base, variants[variant], block && "w-full", className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: IconName;
  block?: boolean;
};

export function Button({ variant = "primary", icon, block, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, block, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  /** Required: an icon button has no visible text. */
  label: string;
};

export function IconButton({ icon, label, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        "inline-flex size-12 flex-none items-center justify-center rounded-pill bg-surface border border-trait text-encre disabled:cursor-not-allowed disabled:text-encre-3",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

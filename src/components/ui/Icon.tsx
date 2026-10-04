import { cx } from "@/lib/cx";

const SPRITE_URL = "/icons/sprite.svg";

/** Line icons (rounded 1.8px stroke), sprite ids prefixed with "i-". */
export const ICON_NAMES = [
  "carnet", "copains", "plus", "minus", "une", "user", "search", "clock", "level",
  "plate", "share", "back", "more", "timer", "check", "alert", "x", "camera", "mic",
  "link", "pen", "cook", "addbook", "bell", "refresh", "lock", "fridge", "pot", "cart",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Accessible name. Without it the icon is decorative. */
  label?: string;
};

export function Icon({ name, size = 22, strokeWidth, className, label }: IconProps) {
  return (
    <svg
      className={cx("icon", className)}
      width={size}
      height={size}
      style={strokeWidth ? { strokeWidth } : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <use href={`${SPRITE_URL}#i-${name}`} />
    </svg>
  );
}

/** Flat-colour pictures from the sprite: categories (c-), ingredients (g-), illustrations (ill-, p-). */
export type PictoId = `c-${string}` | `g-${string}` | `ill-${string}` | `p-${string}`;

type PictoProps = {
  id: PictoId;
  width?: number | string;
  height?: number | string;
  className?: string;
  /** Category pictos follow the text colour. */
  fillCurrent?: boolean;
  label?: string;
};

export function Picto({ id, width = 24, height = width, className, fillCurrent, label }: PictoProps) {
  return (
    <svg
      className={cx("flex-none", fillCurrent && "fill-current", className)}
      width={width}
      height={height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <use href={`${SPRITE_URL}#${id}`} />
    </svg>
  );
}

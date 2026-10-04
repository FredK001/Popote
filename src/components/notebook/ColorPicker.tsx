"use client";

import { Icon } from "@/components/ui/Icon";
import { PROFILE_COLORS, SOLID_BG } from "@/lib/colors";
import { cx } from "@/lib/cx";
import type { ProfileColor } from "@/lib/recipes/types";
import { t } from "@/messages";

type ColorPickerProps = {
  legend: string;
  name: string;
  value: ProfileColor;
  onChange: (color: ProfileColor) => void;
  colors?: ProfileColor[];
};

/** Radio group of colour swatches (48px targets, checked state shown by an icon, not colour alone). */
export function ColorPicker({ legend, name, value, onChange, colors = PROFILE_COLORS }: ColorPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-small font-semibold text-encre-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <label key={color} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
              className="peer sr-only"
            />
            <span
              className={cx(
                "flex size-12 items-center justify-center rounded-pill text-blanc",
                "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bleu-nuit",
                "peer-checked:ring-3 peer-checked:ring-encre peer-checked:ring-offset-2 peer-checked:ring-offset-fond",
                SOLID_BG[color],
              )}
            >
              {value === color && <Icon name="check" size={20} strokeWidth={3} />}
            </span>
            <span className="sr-only">{t.colors[color]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

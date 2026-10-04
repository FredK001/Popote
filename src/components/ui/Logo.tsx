import { APP_NAME } from "@/lib/config";

/** Brand mark: tomato square with a white dot, then the name. */
export function Logo() {
  return (
    <span className="flex items-center gap-2 font-title text-h2 font-extrabold tracking-[-0.02em]">
      <span aria-hidden="true" className="relative size-6.5 rounded-[10px] bg-tomate">
        <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-blanc" />
      </span>
      {APP_NAME}
    </span>
  );
}

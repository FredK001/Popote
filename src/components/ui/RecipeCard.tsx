import Link from "next/link";
import { Icon, Picto, type PictoId } from "./Icon";

type RecipeCardProps = {
  href: string;
  title: string;
  /** Illustration placeholder until real photos exist. */
  picto: PictoId;
  author?: string;
  duration?: string;
};

export function RecipeCard({ href, title, picto, author, duration }: RecipeCardProps) {
  return (
    <Link href={href} className="flex min-h-tap items-center gap-3.5 border-b border-trait py-3 last:border-b-0">
      <span className="size-16 flex-none overflow-hidden rounded-card">
        <Picto id={picto} width="100%" height="100%" className="block" />
      </span>
      <span className="min-w-0">
        <span className="block font-title text-h3 font-bold tracking-[-0.01em]">{title}</span>
        <span className="mt-1 flex items-center gap-2.5 text-small text-encre-3">
          {author && <span>{author}</span>}
          {duration && (
            <span className="flex items-center gap-1">
              <Icon name="clock" size={15} />
              {duration}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

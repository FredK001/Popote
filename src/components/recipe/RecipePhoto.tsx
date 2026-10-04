import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { publicFileUrl } from "@/lib/storage";

type RecipePhotoProps = {
  path: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/** Recipe photo from Storage, or a flat placeholder with a pot. Fills its (relative) parent. */
export function RecipePhoto({ path, alt, sizes, className, priority }: RecipePhotoProps) {
  const url = publicFileUrl("recipe-photos", path);
  if (!url) {
    return (
      <span aria-hidden="true" className={cx("absolute inset-0 flex items-center justify-center bg-fond-2 text-encre-3", className)}>
        <Icon name="pot" size={40} />
      </span>
    );
  }
  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={cx("object-cover", className)} />;
}

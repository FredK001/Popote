"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setRecipePhoto } from "@/app/(focus)/recette/actions";
import { PhotoUpload } from "@/components/notebook/PhotoUpload";
import { Button } from "@/components/ui/Button";
import { t } from "@/messages";

/** Shown on a recipe that arrived from an AI connector without its dish photo. */
export function AddPhotoBanner({ recipeId, userId }: { recipeId: string; userId: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <section className="mt-4 rounded-block bg-laiton-soft p-4" aria-labelledby="add-photo-title">
      <h2 id="add-photo-title" className="text-h3 text-laiton-ink">
        {t.addPhoto.title}
      </h2>
      <p className="mt-1 text-small text-laiton-ink">{t.addPhoto.lead}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PhotoUpload
          bucket="recipe-photos"
          userId={userId}
          label={t.addPhoto.button}
          busyLabel={t.recipeForm.photoUploading}
          errorLabel={t.recipeForm.photoError}
          onUploaded={async (path) => {
            const result = await setRecipePhoto(recipeId, path);
            if (!result.error) {
              setHidden(true);
              router.replace(`/recette/${recipeId}`, { scroll: false });
              router.refresh();
            }
          }}
        />
        <Button variant="text" onClick={() => { setHidden(true); router.replace(`/recette/${recipeId}`, { scroll: false }); }}>
          {t.addPhoto.later}
        </Button>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { markCooked, removeCook } from "@/app/(focus)/recette/social-actions";
import { uploadImage } from "@/components/notebook/PhotoUpload";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Seal } from "@/components/ui/Seal";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/lib/cx";
import { resizeImage } from "@/lib/image-resize";
import type { ProfileColor } from "@/lib/recipes/types";
import { publicFileUrl } from "@/lib/storage";
import { shortDate } from "@/lib/time-ago";
import { format, t } from "@/messages";

export type RecipeCook = {
  id: string;
  user_id: string;
  first_name: string;
  avatar_color: ProfileColor;
  avatar_url: string | null;
  photo_path: string | null;
  note: string | null;
  created_at: string;
};

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

/** "Ils l'ont faite": friends' photos of the dish, and the "Je l'ai faite !" button. */
type CookedSectionProps = {
  recipeId: string;
  userId: string;
  cooks: RecipeCook[];
  /** This month's challenge title, offered when a photo is added. */
  challengeTitle: string;
  onDone: (withPhoto: boolean) => void;
};

export function CookedSection({ recipeId, userId, cooks, challengeTitle, onDone }: CookedSectionProps) {
  const [open, setOpen] = useState(false);
  const [justCooked, setJustCooked] = useState(false);
  const [, startTransition] = useTransition();
  const withPhoto = cooks.filter((c) => c.photo_path);
  const withoutPhoto = cooks.filter((c) => !c.photo_path);
  const mine = cooks.find((c) => c.user_id === userId);
  const name = (c: RecipeCook) => (c.user_id === userId ? t.cooked.you : c.first_name);

  return (
    <section aria-labelledby="cooked-title" className="mt-8">
      <h2 id="cooked-title" className="mb-2 flex items-baseline justify-between text-h2">
        {t.cooked.title}
        {withPhoto.length > 0 && (
          <small className="text-small font-medium text-encre-3">
            {withPhoto.length === 1 ? t.cooked.photoOne : format(t.cooked.photos, { n: withPhoto.length })}
          </small>
        )}
      </h2>

      {mine && (
        <div className="float-right ml-3 -rotate-6">
          <Seal tone="sauge" detail={shortDate(mine.created_at)} animate={justCooked}>
            {t.cooked.stamp}
          </Seal>
        </div>
      )}

      {withPhoto.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 pt-1">
          {withPhoto.map((cook, i) => (
            <li key={cook.id} className={cx("border border-trait bg-surface p-2 pb-3", TILTS[i % TILTS.length])}>
              <div className="relative aspect-[4/3] overflow-hidden bg-fond-2">
                <Image src={publicFileUrl("recipe-photos", cook.photo_path)!} alt={format(t.cooked.photoAlt, { name: cook.first_name })} fill sizes="200px" className="object-cover" />
              </div>
              <p className="mt-2 font-title text-h3 text-encre-2">{name(cook)}</p>
              {cook.note && <p className="mt-0.5 text-caption text-encre-2">{cook.note}</p>}
              {cook.user_id === userId && (
                <button
                  type="button"
                  className="tap-target mt-1 text-caption font-semibold text-tomate-dark underline"
                  onClick={() => startTransition(async () => void (await removeCook(cook.id, recipeId)))}
                >
                  {t.cooked.remove}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {withoutPhoto.length > 0 && (
        <p className="mt-3 flex items-center gap-2.5 text-small text-encre-2">
          <AvatarStack>
            {withoutPhoto.slice(0, 4).map((c) => (
              <Avatar key={c.id} name={name(c)} tone={c.avatar_color} photoUrl={c.avatar_url} size="s" />
            ))}
          </AvatarStack>
          {withoutPhoto.slice(0, 3).map(name).join(", ")}
          {withoutPhoto.length > 3 && ` +${withoutPhoto.length - 3}`}
        </p>
      )}

      <Button variant="secondary" icon="camera" block className="mt-3 clear-both" onClick={() => setOpen(true)}>
        {t.cooked.button}
      </Button>

      <CookedSheet
        open={open}
        onClose={() => setOpen(false)}
        recipeId={recipeId}
        userId={userId}
        challengeTitle={challengeTitle}
        onDone={(photo) => {
          setOpen(false);
          setJustCooked(true);
          onDone(photo);
        }}
      />
    </section>
  );
}

type CookedSheetProps = {
  open: boolean;
  onClose: () => void;
  recipeId: string;
  userId: string;
  challengeTitle: string;
  onDone: (withPhoto: boolean) => void;
};

function CookedSheet({ open, onClose, recipeId, userId, challengeTitle, onDone }: CookedSheetProps) {
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [note, setNote] = useState("");
  const [joinChallenge, setJoinChallenge] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(false);
    try {
      const blob = await resizeImage(file, 1600);
      setPhoto((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    } catch {
      setError(true);
    }
  }

  function save() {
    startTransition(async () => {
      try {
        const path = photo ? await uploadImage("recipe-photos", userId, photo.blob) : null;
        const result = await markCooked(recipeId, path, note, joinChallenge);
        if (result.error) throw new Error(result.error);
        setPhoto(null);
        setNote("");
        setJoinChallenge(false);
        onDone(Boolean(path));
      } catch {
        setError(true);
      }
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.cooked.sheetTitle}>
      <p className="mb-4 text-encre-2">{t.cooked.sheetLead}</p>

      <label className="relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-[1.5px] border-dashed border-encre-3 bg-surface text-encre-2 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-bleu-nuit">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL)
          <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <Icon name="camera" size={32} />
            <span className="font-semibold">{t.cooked.addPhoto}</span>
          </>
        )}
        <input type="file" accept="image/*" className="sr-only" aria-label={photo ? t.cooked.changePhoto : t.cooked.addPhoto} onChange={(e) => void pick(e.target.files?.[0])} />
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-small font-semibold">{t.cooked.note}</span>
        <input
          value={note}
          maxLength={280}
          placeholder={t.cooked.notePlaceholder}
          onChange={(e) => setNote(e.target.value)}
          className="h-12 w-full rounded-card border-[1.5px] border-trait bg-surface px-4 placeholder:text-encre-3 focus:border-encre"
        />
      </label>

      {photo && (
        <label className="mt-4 flex min-h-tap cursor-pointer items-start gap-3 rounded-card bg-sauge-soft p-3 text-sauge-ink">
          <input
            type="checkbox"
            checked={joinChallenge}
            onChange={(e) => setJoinChallenge(e.target.checked)}
            className="mt-0.5 size-5 flex-none accent-sauge"
          />
          <span>
            <span className="block font-semibold">{format(t.challenge.join, { title: challengeTitle })}</span>
            <span className="block text-caption">{t.challenge.joinHint}</span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {t.errors.generic}
        </p>
      )}

      <Button icon="check" block className="mt-5" disabled={pending} onClick={save}>
        {pending ? (photo ? t.recipeForm.photoUploading : t.common.loading) : t.cooked.save}
      </Button>
    </Sheet>
  );
}

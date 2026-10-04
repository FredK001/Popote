"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { DraftErrorCode } from "@/app/api/ajouter/brouillon/route";
import { saveRecipe } from "@/app/(focus)/recette/actions";
import { uploadImage } from "@/components/notebook/PhotoUpload";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { Button, buttonClasses, IconButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PotLoader, ProgressSteps, type StepState } from "@/components/ui/PotLoader";
import { Sheet } from "@/components/ui/Sheet";
import type { RecipeDraft } from "@/lib/ai/schema";
import { draftToRecipeInput } from "@/lib/ai/to-recipe";
import { cx } from "@/lib/cx";
import { resizeImage } from "@/lib/image-resize";
import type { RecipeInput } from "@/lib/recipes/schema";
import type { Category } from "@/lib/recipes/types";
import { format, t } from "@/messages";
import { DraftReview } from "./DraftReview";
import { useSpeech } from "./useSpeech";

const a = t.add;
const MAX_PHOTOS = 5;

type Way = "photos" | "voice" | "text" | "link";
type Screen =
  | { name: "choose" }
  | { name: "input"; way: Way }
  | { name: "loading"; way: Way }
  | { name: "review"; way: Way }
  | { name: "edit" }
  | { name: "error"; way: Way; code: DraftErrorCode };

type Props = { userId: string; categories: Category[]; hasAi: boolean };

const WAYS: Array<{ way: Way; icon: IconName; title: string; hint: string; tone: string; iconTone: string; needsAi: boolean }> = [
  { way: "photos", icon: "camera", title: a.photo, hint: a.photoHint, tone: "bg-tomate", iconTone: "text-tomate", needsAi: true },
  { way: "voice", icon: "mic", title: a.voice, hint: a.voiceHint, tone: "bg-sauge", iconTone: "text-sauge", needsAi: true },
  { way: "link", icon: "link", title: a.link, hint: a.linkHint, tone: "bg-prune", iconTone: "text-prune", needsAi: false },
  { way: "text", icon: "pen", title: a.text, hint: a.textHint, tone: "bg-laiton", iconTone: "text-laiton", needsAi: true },
];

/**
 * "Ajouter une recette": four ways in (photos, voice, link, free text), the pot while
 * the AI works, then the draft to check. Without AI: link import and manual entry.
 */
export function AddRecipeFlow({ userId, categories, hasAi }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: "choose" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [prefill, setPrefill] = useState<RecipeInput | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const appendSpoken = useCallback((spoken: string) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken)), []);
  const speech = useSpeech(appendSpoken);

  async function request(way: Way, extra?: { previous: RecipeDraft; answers: string[]; photos?: Blob[] }): Promise<void> {
    let res: Response;
    try {
      if (way === "photos") {
        const form = new FormData();
        for (const blob of extra?.photos ?? photos) form.append("images", blob, "photo");
        if (extra) {
          form.append("previous", JSON.stringify(extra.previous));
          form.append("answers", JSON.stringify(extra.answers));
        }
        res = await fetch("/api/ajouter/brouillon", { method: "POST", body: form });
      } else {
        res = await fetch("/api/ajouter/brouillon", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: way, text, url, previous: extra?.previous, answers: extra?.answers }),
        });
      }
    } catch {
      setScreen({ name: "error", way, code: "unavailable" });
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { draft?: RecipeDraft; sourceUrl?: string; error?: DraftErrorCode };
    if (!res.ok || !body.draft) {
      setScreen({ name: "error", way, code: body.error ?? "unavailable" });
      return;
    }
    setDraft(body.draft);
    if (body.sourceUrl) setSourceUrl(body.sourceUrl);
    setScreen({ name: "review", way });
  }

  function start(way: Way) {
    setSaveError(null);
    setAnswers([]);
    setSourceUrl(null);
    setScreen({ name: "loading", way });
    void request(way);
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const resized = await Promise.all([...files].slice(0, room).map((f) => resizeImage(f, 1600)));
    setPhotos((prev) => [...prev, ...resized].slice(0, MAX_PHOTOS));
  }

  async function refineWithPhoto(file: File) {
    if (!draft || photos.length >= MAX_PHOTOS) return;
    setRefining(true);
    const blob = await resizeImage(file, 1600);
    const all = [...photos, blob];
    setPhotos(all);
    await request("photos", { previous: draft, answers, photos: all });
    setRefining(false);
  }

  /** Uploads the dish photo spotted by the AI, then builds the recipe input. */
  async function toInput(): Promise<RecipeInput> {
    if (!draft) throw new Error("no draft");
    let photoPath: string | null = null;
    if (draft.dish_photo_index != null && photos[draft.dish_photo_index]) {
      photoPath = await uploadImage("recipe-photos", userId, photos[draft.dish_photo_index]).catch(() => null);
    }
    return draftToRecipeInput(draft, { categories, sourceUrl, photoPath });
  }

  function save() {
    setSaveError(null);
    startSaving(async () => {
      const result = await saveRecipe(await toInput());
      // On success the action redirects to the new recipe.
      if (result?.error) setSaveError(result.error);
    });
  }

  function edit() {
    startSaving(async () => {
      setPrefill(await toInput());
      setScreen({ name: "edit" });
    });
  }

  const backToChoice = () => {
    speech.stop();
    setScreen({ name: "choose" });
  };

  const header = (onBack: (() => void) | null) => (
    <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
      {onBack ? (
        <IconButton icon="back" label={a.back} onClick={onBack} className="border-0 bg-transparent" />
      ) : (
        <Link href="/carnet" aria-label={a.close} className="inline-flex size-12 items-center justify-center rounded-pill">
          <Icon name="x" />
        </Link>
      )}
    </header>
  );

  // ---------------------------------------------------------------- screens
  if (screen.name === "edit" && prefill) {
    return (
      <main>
        {header(() => setScreen({ name: "review", way: "photos" }))}
        <h1 className="px-gutter pb-4 font-title text-h1">{t.recipeForm.newTitle}</h1>
        <RecipeForm userId={userId} categories={categories} prefill={prefill} />
      </main>
    );
  }

  if (screen.name === "loading") {
    const steps = screen.way === "photos" ? a.stepsPhotos : screen.way === "link" ? a.stepsLink : a.stepsText;
    return (
      <main>
        {header(null)}
        <div className="px-gutter">
          <h1 className="font-title text-display">{a.loadingTitle}</h1>
          <p className="mt-2 text-encre-2">
            {screen.way === "photos" ? a.loadingPhotos : screen.way === "link" ? a.loadingLink : a.loadingText}
          </p>
          <div className="mt-5" role="status" aria-live="polite">
            <PotLoader />
            <TimedSteps labels={steps} />
          </div>
        </div>
      </main>
    );
  }

  if (screen.name === "review" && draft) {
    return (
      <main>
        {header(backToChoice)}
        <DraftReview
          draft={draft}
          onChange={(next, answer) => {
            setDraft(next);
            if (answer) setAnswers((prev) => [...prev, answer]);
          }}
          sourceUrl={sourceUrl}
          onMorePhoto={screen.way === "photos" && photos.length < MAX_PHOTOS ? refineWithPhoto : undefined}
          refining={refining}
          onSave={save}
          onEdit={edit}
          saving={saving}
          error={saveError}
        />
      </main>
    );
  }

  if (screen.name === "error") {
    return (
      <main>
        {header(backToChoice)}
        <AddError
          code={screen.code}
          onRetry={() => setScreen(screen.way === "photos" ? { name: "input", way: "photos" } : { name: "input", way: screen.way })}
          onOtherWay={backToChoice}
        />
      </main>
    );
  }

  if (screen.name === "input") {
    const way = screen.way;
    return (
      <main>
        {header(backToChoice)}
        <div className="space-y-5 px-gutter pb-10">
          {way === "photos" && (
            <>
              <h1 className="font-title text-h1">{a.photosTitle}</h1>
              <p className="text-encre-2">{a.photosLead}</p>
              <ul className="grid grid-cols-3 gap-2.5">
                {photos.map((blob, i) => (
                  <li key={i} className="relative aspect-square overflow-hidden rounded-card bg-fond-2">
                    <BlobImage blob={blob} />
                    <button
                      type="button"
                      aria-label={format(a.photosRemove, { n: i + 1 })}
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-pill bg-surface tap-target"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </li>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <li>
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-[1.5px] border-dashed border-encre-3 text-center text-small font-semibold text-encre-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-bleu-nuit">
                      <Icon name="camera" size={28} />
                      <span className="px-1">{a.photosAdd}</span>
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addPhotos(e.target.files)} />
                    </label>
                  </li>
                )}
              </ul>
              <Button block icon="check" disabled={photos.length === 0} onClick={() => start("photos")}>
                {a.photosGo}
              </Button>
            </>
          )}

          {way === "voice" && (
            <>
              <h1 className="font-title text-h1">{a.voiceTitle}</h1>
              <p className="text-encre-2">{a.voiceLead}</p>
              {speech.supported ? (
                <Button
                  block
                  variant={speech.listening ? "secondary" : "primary"}
                  icon="mic"
                  onClick={speech.listening ? speech.stop : speech.start}
                >
                  {speech.listening ? a.voiceStop : a.voiceStart}
                </Button>
              ) : (
                <p className="rounded-card bg-ciel-soft p-4 text-small text-bleu-nuit">{a.voiceFallback}</p>
              )}
              {speech.listening && <p className="text-small text-encre-3" aria-live="polite">{a.voiceListening} {speech.interim}</p>}
              <TextArea label={a.voiceLabel} value={text} onChange={setText} />
              <Button block disabled={!text.trim()} onClick={() => start("voice")}>
                {a.send}
              </Button>
            </>
          )}

          {way === "text" && (
            <>
              <h1 className="font-title text-h1">{a.textTitle}</h1>
              <TextArea label={a.textLabel} value={text} onChange={setText} placeholder={a.textPlaceholder} rows={10} />
              <Button block disabled={!text.trim()} onClick={() => start("text")}>
                {a.send}
              </Button>
            </>
          )}

          {way === "link" && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) start("link");
              }}
            >
              <h1 className="font-title text-h1">{a.linkTitle}</h1>
              <p className="text-encre-2">{a.linkLead}</p>
              <Field label={a.linkLabel} type="url" inputMode="url" placeholder={a.linkPlaceholder} value={url} onChange={(e) => setUrl(e.target.value)} required />
              <Button type="submit" block icon="link" disabled={!url.trim()}>
                {a.import}
              </Button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------- choose
  return (
    <main>
      {header(null)}
      <div className="px-gutter pb-10">
        <h1 className="font-title text-display">{a.title}</h1>
        <p className="mt-2 text-encre-2">{a.lead}</p>

        {!hasAi && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="mt-5 flex w-full items-center gap-3 rounded-card bg-laiton-soft p-4 text-left font-semibold text-laiton-ink"
          >
            <Icon name="camera" />
            <span className="flex-1">{a.invite}</span>
            <Icon name="back" className="rotate-180" />
          </button>
        )}

        <ul className="mt-5 grid grid-cols-2 gap-3">
          {WAYS.map((w) => {
            const locked = w.needsAi && !hasAi;
            return (
              <li key={w.way}>
                <button
                  type="button"
                  onClick={() => (locked ? setInviteOpen(true) : setScreen({ name: "input", way: w.way }))}
                  className={cx(
                    "relative flex min-h-42 w-full flex-col justify-between overflow-hidden rounded-block p-4 text-left text-blanc transition-transform duration-150 active:scale-[.97]",
                    w.tone,
                  )}
                >
                  <span aria-hidden="true" className="absolute -top-12 -right-12 size-32.5 rounded-pill bg-blanc/13" />
                  <span className={cx("relative flex size-13 items-center justify-center rounded-pill bg-blanc", w.iconTone)}>
                    <Icon name={w.icon} size={28} />
                  </span>
                  <span className="relative">
                    <b className="block text-h3">{w.title}</b>
                    <span className="mt-1 block text-small">{w.hint}</span>
                    {locked && <span className="mt-2 inline-block rounded-pill bg-blanc px-2 py-0.5 text-caption font-bold text-encre">{a.withAi}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Link href="/recette/nouvelle" className={cx(buttonClasses("text", true), "mt-5 text-encre-2 underline underline-offset-3")}>
          {a.manual}
        </Link>
      </div>

      <Sheet open={inviteOpen} onClose={() => setInviteOpen(false)} title={a.invite}>
        <p className="text-encre-2">{a.inviteLead}</p>
        <div className="mt-5 space-y-3">
          <Link href="/profil/ia" className={buttonClasses("primary", true)}>
            {a.inviteCta}
          </Link>
          <Button variant="secondary" block icon="link" onClick={() => { setInviteOpen(false); setScreen({ name: "input", way: "link" }); }}>
            {a.link}
          </Button>
          <Link href="/recette/nouvelle" className={buttonClasses("text", true)}>
            {a.manualShort}
          </Link>
        </div>
      </Sheet>
    </main>
  );
}

/** Progress steps that advance over time while waiting (10 to 20 s expected). */
function TimedSteps({ labels }: { labels: readonly string[] }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const timers = [2500, 7000].map((ms, i) => window.setTimeout(() => setDone((d) => Math.max(d, i + 1)), ms));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  const state = (i: number): StepState => (i < done ? "done" : i === done ? "current" : "todo");
  return <ProgressSteps steps={labels.map((label, i) => ({ label, state: state(i) }))} />;
}

function BlobImage({ blob }: { blob: Blob }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked photo
  return src ? <img src={src} alt="" className="size-full object-cover" /> : null;
}

function TextArea({ label, value, onChange, placeholder, rows = 6 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-small font-semibold text-encre-2">{label}</span>
      <textarea
        rows={rows}
        maxLength={20000}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-card border-[1.5px] border-trait bg-surface px-4 py-3 placeholder:text-encre-3 focus:border-encre"
      />
    </label>
  );
}

const SETTINGS_ERRORS: DraftErrorCode[] = ["not_connected", "auth_expired", "cap_reached"];

/** Says what happened and how to succeed next time. Never a dead end. */
function AddError({ code, onRetry, onOtherWay }: { code: DraftErrorCode; onRetry: () => void; onOtherWay: () => void }) {
  const errors: Record<string, { title: string; lead: string; tips: readonly string[] }> = a.errors;
  const copy = errors[code] ?? a.errors.unavailable;
  const toSettings = SETTINGS_ERRORS.includes(code);
  return (
    <div className="px-gutter pb-10 text-center">
      <span className="mx-auto mt-8 flex size-24 items-center justify-center rounded-pill bg-alerte-soft text-alerte">
        <Icon name={code === "link_unreachable" || code === "link_no_recipe" ? "link" : "camera"} size={44} />
      </span>
      <h1 className="mt-5 font-title text-h1" role="alert">
        {copy.title}
      </h1>
      <p className="mx-auto mt-2.5 max-w-[32ch] text-encre-2">{copy.lead}</p>
      {copy.tips.length > 0 && (
        <ul className="mx-1 mt-5 list-disc rounded-card border border-trait bg-surface p-4 pl-8 text-left">
          {copy.tips.map((tip) => (
            <li key={tip} className="py-0.5">
              {tip}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 space-y-3">
        {toSettings ? (
          <Link href="/profil/ia" className={buttonClasses("primary", true)}>
            {a.toSettings}
          </Link>
        ) : (
          <Button block icon="refresh" onClick={onRetry}>
            {a.retry}
          </Button>
        )}
        <Button variant="secondary" block onClick={onOtherWay}>
          {a.back}
        </Button>
        <Link href="/recette/nouvelle" className={buttonClasses("text", true)}>
          {a.manualShort}
        </Link>
      </div>
    </div>
  );
}

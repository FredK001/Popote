import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon, ICON_NAMES } from "@/components/ui/Icon";
import { InfoPill, Tag } from "@/components/ui/Pills";
import { PotLoader, ProgressSteps } from "@/components/ui/PotLoader";
import { RecipeCard } from "@/components/ui/RecipeCard";
import { Badge, Seal, Sticker } from "@/components/ui/Seal";
import { TabBar } from "@/components/ui/TabBar";
import { Toast } from "@/components/ui/Toast";
import { format, t } from "@/messages";
import { CategoriesDemo, IngredientsDemo, MotionDemo } from "./Demos";

const ds = t.designSystem;
const s = ds.sample;

export const metadata: Metadata = { title: ds.title, robots: { index: false } };

const SWATCHES: Record<string, Array<{ token: string; onDark?: boolean }>> = {
  brand: [
    { token: "tomate", onDark: true }, { token: "tomate-dark", onDark: true }, { token: "laiton", onDark: true },
    { token: "sauge", onDark: true }, { token: "prune", onDark: true }, { token: "bleu-nuit", onDark: true },
  ],
  neutrals: [
    { token: "fond" }, { token: "fond-2" }, { token: "surface" }, { token: "trait" },
    { token: "encre", onDark: true }, { token: "encre-2", onDark: true }, { token: "encre-3", onDark: true },
  ],
  soft: [
    { token: "tomate-soft" }, { token: "laiton-soft" }, { token: "sauge-soft" }, { token: "prune-soft" },
    { token: "abricot-soft" }, { token: "ciel-soft" },
  ],
  functional: [
    { token: "succes", onDark: true }, { token: "succes-soft" }, { token: "alerte", onDark: true },
    { token: "alerte-soft" }, { token: "erreur", onDark: true }, { token: "erreur-soft" },
  ],
};

const TYPE_SCALE = [
  { cls: "font-title text-display", name: "Display", spec: "Bricolage 800 · 32/34" },
  { cls: "font-title text-h1", name: "Titre 1", spec: "Bricolage 800 · 26/30" },
  { cls: "text-h2", name: "Titre 2", spec: "Figtree 700 · 20/26" },
  { cls: "text-h3", name: "Titre 3", spec: "Figtree 700 · 17/23" },
  { cls: "text-body", name: "Corps", spec: "Figtree 400 · 16/24" },
  { cls: "text-small", name: "Petit", spec: "Figtree 400 · 14/20" },
  { cls: "text-caption", name: "Légende", spec: "Figtree 500 · 12/16" },
  { cls: "text-cook", name: "Mode cuisine", spec: "Figtree 600 · 28/38" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-title text-h1">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-trait bg-surface p-5">
      <h3 className="mb-3 text-small font-semibold text-encre-3">{title}</h3>
      {children}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-5xl px-gutter pt-10 pb-40">
      <h1 className="font-title text-display">{ds.title}</h1>
      <p className="mt-2 max-w-[60ch] text-encre-2">{ds.lead}</p>

      <Section title={ds.colors}>
        {(Object.keys(SWATCHES) as Array<keyof typeof SWATCHES>).map((group) => (
          <div key={group} className="mb-6">
            <h3 className="mb-2 text-h3">{ds[group as "brand" | "neutrals" | "soft" | "functional"]}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {SWATCHES[group].map(({ token, onDark }) => (
                <li key={token} className="overflow-hidden rounded-card border border-trait bg-surface">
                  <div
                    className="flex h-16 items-end p-2 text-small font-semibold"
                    style={{ background: `var(--${token})`, color: onDark ? "var(--blanc)" : "var(--encre)" }}
                  >
                    Aa
                  </div>
                  <code className="block p-2 text-caption text-encre-2">--{token}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title={ds.typography}>
        <div className="rounded-card border border-trait bg-surface p-5">
          {TYPE_SCALE.map((row) => (
            <div key={row.name} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-trait py-3 last:border-b-0">
              <span className={row.cls}>{row.name}</span>
              <span className="text-small text-encre-3">{row.spec}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={ds.shapes}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="8 · 16 · 24 · pilule">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-tag border-2 border-encre" />
              <div className="size-14 rounded-card border-2 border-encre" />
              <div className="size-14 rounded-block border-2 border-encre" />
              <div className="h-11 w-21 rounded-pill border-2 border-encre" />
            </div>
          </Panel>
          <Panel title="4 · 8 · 12 · 16 · 20 · 24 · 32 · 48">
            <div className="flex items-end gap-3">
              {[1, 2, 3, 4, 5, 6, 8, 12].map((n) => (
                <div key={n} className="bg-tomate" style={{ width: `calc(var(--spacing) * ${n})`, height: `calc(var(--spacing) * ${n})` }} />
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      <Section title={ds.components}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={ds.buttons}>
            <div className="flex flex-wrap items-center gap-3">
              <Button icon="addbook">{t.recipe.addToNotebook}</Button>
              <Button variant="secondary" icon="share">{t.recipe.share}</Button>
              <Button variant="brass" icon="timer">{format(t.recipe.startTimer, { n: 25 })}</Button>
              <Button variant="added" icon="check">{t.recipe.inNotebook}</Button>
              <Button variant="text">{s.manual}</Button>
              <Button disabled>{s.unavailable}</Button>
              <IconButton icon="back" label={t.common.back} />
              <IconButton icon="more" label={t.common.more} />
            </div>
          </Panel>

          <Panel title={ds.fields}>
            <div className="space-y-3">
              <Field label={s.search} hideLabel icon="search" placeholder={s.search} type="search" />
              <Field label={s.email} type="email" defaultValue={s.emailValue} error={s.emailError} />
            </div>
          </Panel>

          <Panel title={ds.pills}>
            <div className="flex flex-wrap gap-2">
              <InfoPill kind="time">{format(t.recipe.minutes, { n: 45 })}</InfoPill>
              <InfoPill kind="difficulty">{t.recipe.difficulty[1]}</InfoPill>
              <InfoPill kind="servings">{format(t.recipe.servings, { n: 6 })}</InfoPill>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag tone="sauge">{s.tags[0]}</Tag>
              <Tag tone="tomate">{s.tags[1]}</Tag>
              <Tag tone="laiton">{s.tags[2]}</Tag>
              <Tag tone="prune">{s.tags[3]}</Tag>
            </div>
            <div className="mt-3">
              <AvatarStack>
                <Avatar name="Fred" tone="tomate" />
                <Avatar name="Julie" tone="sauge" />
                <Avatar name="Karim" tone="prune" />
                <Avatar name="Léa" tone="bleu-nuit" />
                <Avatar name="+3" tone="encre-2">+3</Avatar>
              </AvatarStack>
            </div>
          </Panel>

          <Panel title={ds.categories}>
            <CategoriesDemo />
          </Panel>

          <Panel title={ds.recipeCard}>
            <RecipeCard href="/design-system" picto="ill-gratin" title={s.gratin} author={format(t.recipe.from, { name: s.recipeAuthor })} duration="1 h 10" />
            <RecipeCard href="/design-system" picto="ill-tarte" title={s.recipeTitle} author={format(t.recipe.from, { name: "Fred" })} duration="45 min" />
          </Panel>

          <Panel title={ds.seals}>
            <div className="flex flex-wrap items-center gap-4">
              <Seal>{t.recipe.inNotebook}</Seal>
              <Seal tone="sauge" detail={s.cookedDate}>{t.recipe.cooked}</Seal>
              <Seal tone="laiton">{s.chefOfWeek}</Seal>
              <Seal compact>{t.recipe.inNotebook}</Seal>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Badge icon="share" title={s.firstShare} subtitle={s.firstShareDate} />
              <Badge icon="carnet" title={s.tenRecipes} subtitle={format(t.badges.lockedRemaining, { n: 3 })} locked />
            </div>
          </Panel>

          <Panel title={ds.sticker}>
            <Sticker before={t.recipe.adoptedBy} figure={14} after={t.recipe.friendsWord} />
          </Panel>

          <Panel title={ds.toast}>
            <Toast>{format(t.recipe.addedToast, { title: s.recipeTitle })}</Toast>
          </Panel>
        </div>

        <div className="mt-4">
          <Panel title={ds.ingredients}>
            <div className="max-w-[390px] rounded-block bg-fond p-3">
              <IngredientsDemo />
            </div>
          </Panel>
        </div>

        <div className="mt-4">
          <Panel title={ds.tabbar}>
            <div className="-mx-5 -mb-5 max-w-[430px] pt-8">
              <TabBar fixed={false} activeHref="/carnet" />
            </div>
          </Panel>
        </div>
      </Section>

      <Section title={ds.motion}>
        <p className="mb-4 text-small text-encre-2">{ds.motionHint}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={s.confetti}>
            <MotionDemo />
          </Panel>
          <Panel title={t.ai.loading}>
            <PotLoader />
            <ProgressSteps
              steps={[
                { label: t.ai.stepRead, state: "done" },
                { label: t.ai.stepIngredients, state: "current" },
                { label: t.ai.stepSteps, state: "todo" },
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section title={ds.icons}>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {ICON_NAMES.map((name) => (
            <li key={name} className="flex flex-col items-center gap-1 rounded-card bg-surface p-3">
              <Icon name={name} />
              <code className="text-caption text-encre-3">{name}</code>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

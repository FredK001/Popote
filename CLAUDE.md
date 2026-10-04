@AGENTS.md

# Popote

Social recipe PWA: each user keeps a recipe notebook and shares recipes with friends, who add them to their own notebook in one tap.
Product brief: `popote-prompt-claude-code.md`. Visual reference: `design/popote-v4-ingredients.html` (open in a browser).
The app name is provisional: use `APP_NAME` from `src/lib/config.ts`, never the literal.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack), React 19.3, TypeScript 6.0 strict |
| Style | Tailwind CSS 4.3 driven by tokens (`src/styles/tokens.css` → `@theme` in `src/app/globals.css`) |
| Data, auth, files | Supabase (Postgres 17, Auth, Storage), EU region, project `dlyxwupqucwiglrdrnho` |
| Hosting | Netlify (OpenNext adapter, auto-detected, not pinned) |
| Tests | Vitest 5 (unit), Playwright 1.63 + axe (e2e, 390 × 844), pgTAP (RLS, run in CI only) |
| CI | GitHub Actions: `.github/workflows/ci.yml` |

## Commands

```bash
npm run dev          # local app on :3000
npm run lint         # ESLint (eslint-config-next)
npm run typecheck    # next typegen + tsc
npm test             # Vitest (contrast, design guard, logic)
npm run build && npm run e2e   # Playwright (starts `next start`)
npx supabase migration new <name>   # new migration file
npm run db:link      # link the CLI to the remote project (asks for the DB password)
npm run db:push      # apply pending migrations to the remote project
```

## Conventions

- UI in French, informal "tu". Code, table names and comments in English.
- **All UI strings** live in `src/messages/fr.ts`; use `t` and `format()` from `@/messages`.
- Work phase by phase (brief §9). One branch per phase, PR to `main`, Conventional Commits.
- Before using a library or API, check its current version and docs. Next.js docs ship in `node_modules/next/dist/docs/`.

### Design system rules (enforced by `tests/unit/design-guard.test.ts` and `contrast.test.ts`)

- No hardcoded colour, radius or shadow in components: Tailwind utilities mapped on tokens only. Tailwind's default palette, shadows, radii and type scale are disabled in `globals.css`.
- No gradients, no shadows, no emoji. Literal colours only in `tokens.css` and `src/lib/theme.ts` (for manifest/meta).
- Text on brass (`laiton`) is always white. Every new text/background pair goes in `contrast.test.ts` (AA 4.5:1; UI parts 3:1).
- Touch targets ≥ 48px (`min-h-tap`, `size-12`, or the `tap-target` utility for small chips). Visible focus (bleu-nuit outline).
- `prefers-reduced-motion`: every animation is cut globally. Only the pot loader animates without a user action.
- Error red is close to brand red: errors always come with an icon and a message.
- Type scale utilities: `text-display` / `text-h1` (with `font-title`), `text-h2`, `text-h3`, `text-body`, `text-small`, `text-caption`, `text-note`, `text-cook`, `text-qty`, `text-micro`.
- Radii: `rounded-tag` 8, `rounded-card` 16, `rounded-block` 24, `rounded-pill`.
- Icons: `public/icons/sprite.svg` (from the mockup). `<Icon name>` for line icons (`i-*`), `<Picto id>` for flat pictures (`c-*` categories, `g-*` ingredients, `ill-*`, `p-*`).
- Components are custom (no UI kit) in `src/components/ui/`, all shown on `/design-system`.

### Supabase

- Schema changes only through versioned migrations in `supabase/migrations/`.
- RLS on **every** table with explicit policies, plus a pgTAP test in `supabase/tests/database/`.
- Clients: `@/lib/supabase/client` (browser), `@/lib/supabase/server` (acts as the user), `@/lib/supabase/admin` (service role, server only, guarded by `server-only`).
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` never reach the client.
- Default categories carry a `default_key` translated by the UI; custom categories carry a `name`.

## Decisions

- **No Docker on the dev machine** (user decision, it slows the computer down). No local Supabase stack: develop against the remote project; migrations and pgTAP RLS tests run in CI (`database` job), where runners have Docker.

- **TypeScript 6.0, not 7.0**: typescript-eslint 8.x supports `<6.1`. Revisit when it supports TS 7.
- **ESLint 9.39**: ESLint 10 crashes `eslint-plugin-react` bundled with `eslint-config-next` 16.3.
- **Tailwind v4** chosen over CSS Modules (user decision), locked down to tokens.
- **Radius token names** are `--rayon-*` in `tokens.css` so Tailwind's `--radius-*` theme keys can point to them without a self-reference.
- The mockup still holds v3 names/values (`--cerise`, `--papier` #F6F2EC, Shantell Sans) overridden by v4: **the brief wins** (`--tomate`, `--fond` #F7F2EA, Bricolage Grotesque). Sprite illustrations were recoloured accordingly.
- Accessibility adjustments vs mockup: unchecked ingredient tick ring uses `encre-3` (3:1 non-text contrast) instead of `trait`; checked tiles don't fade text to 60% (would fail AA); text buttons, active tab use `tomate-dark`.
- Icon buttons are 48px (mockup: 44) to meet the 48px target rule.
- Netlify: adapter not pinned (Netlify's recommendation); Node from `.nvmrc` (22).

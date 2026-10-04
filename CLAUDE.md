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
npm run db:test:remote   # run pgTAP RLS tests on the remote project, rolled back (no Docker)
npx supabase db advisors --linked --type security   # Supabase security linter
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
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_CLIENT_SECRET`, `AI_TOKENS_ENCRYPTION_KEY` and users' ChatGPT tokens never reach the client.
- Default categories carry a `default_key` translated by the UI; custom categories carry a `name`.

## Decisions

- **No Docker on the dev machine** (user decision, it slows the computer down). No local Supabase stack: develop against the remote project; migrations and pgTAP RLS tests run in CI (`database` job), where runners have Docker.

- **Auth e-mails via SendGrid SMTP** (same account as the user's AppFlechettes project), set in Supabase → Authentication → Emails → SMTP Settings. Templates "Magic link or OTP" and "Confirm signup" link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` and show `{{ .Token }}` (6-digit fallback). `/auth/confirm` also accepts a PKCE `code` (Supabase default template).
- **Remote DB tests without Docker**: `scripts/tap2do.py` wraps each pgTAP file in a DO block that always ends with an exception, so nothing is committed; run through `supabase db query --linked`. Tests must not assume an empty database (filter on the test's own ids).
- **Pending "add to notebook" action**: the claim URL `/r/{token}/ajouter` is carried as `?next=` through Supabase (inside the e-mail link, the code form, Google's redirect) and onboarding. No localStorage. `claim_share()` adds the entry with `received_from` and creates the friendship.
- **Public share page** reads with the service role (`getPublicShare`), exposing only that recipe, the sender's first name/avatar and first names along the genealogy. Never indexed.
- **OG images**: `next/og` cannot read WebP, so photos are converted to JPEG with `sharp` (direct dependency). Fonts are static TTFs in `src/assets/fonts`. Colours come from `OG_COLORS` in `src/lib/theme.ts` (checked against tokens).
- **Redirects use the request Host header** (`requestOrigin`), so a phone on the LAN or a deploy preview is never sent to `localhost`/`0.0.0.0`.
- **Supabase security advisor**: remaining warnings are intended — `claim_share`, `my_recipe_genealogy`, `recipe_reach`, `are_friends` are callable by signed-in users and check access themselves. No passwords are used, so leaked-password protection is irrelevant.
- **Add-recipe flow (phase 3a)**: `/ajouter` → `POST /api/ajouter/brouillon` → `RecipeDraft` (`src/lib/ai/schema.ts`, shared with the future MCP connector) → review with one-tap answers → `saveRecipe`. Providers implement `AiProvider` (`src/lib/ai/provider.ts`); `getAiProvider()` returns null until "Sign in with ChatGPT" access is granted (its OAuth docs are not public yet, so nothing is guessed). `fakeProvider` (AI_FAKE_PROVIDER=1, dev/e2e only) drives development and the Playwright journey. One retry on unusable output, then `invalid_output`.
- **Link import without AI**: schema.org/Recipe JSON-LD (`src/lib/recipes/jsonld.ts`); falls back to the AI only when one is connected. Pages are fetched by `fetchPage` (http/https, public IPs only at every redirect, 8 s, 2 MB, HTML only) against SSRF.
- **Ingredient catalogue**: closed list of 44 keys (36 ingredients + 8 family generics) in `src/lib/recipes/ingredient-catalog.ts`, each with a `g-{key}` picto, family, aisle and tint. Manual entry and JSON-LD guess keys from names; the AI must pick from the list.
- **Anti-abuse**: `ai_rate_check()` (service role) allows 10 AI requests/min/user (20 link fetches).
- **Signed-in e2e** create throwaway users through the admin API when `.env.local` has real keys (`tests/e2e/helpers.ts`), and delete them; in CI they are skipped.
- **MCP connector (phase 3b)**: `/mcp` (mcp-handler 2 + @modelcontextprotocol/server 2), tools `popote_list_categories`, `popote_list_ingredient_keys`, `popote_create_recipe` (input = the shared draft schema). OAuth 2.1 is the **Supabase Auth OAuth server** (dynamic client registration, PKCE); `/mcp` only verifies the bearer token with `getClaims(token)` and calls Supabase as the user (RLS applies). Metadata at `/.well-known/oauth-protected-resource/mcp` (resource = `{origin}/mcp`). Consent UI at `/oauth/consent` (Supabase "Authorization path"). Tool results link to `/recette/{id}?photo=1`, which invites to add the dish photo.
- **PWA (phase 4)**: hand-written `public/sw.js` instead of Serwist (Serwist's Turbopack mode serves the worker through a generated route with its own scope rules; our caching rules for personal pages are simpler to state by hand). Network-first for the notebook and recipe pages (kept offline, max 60), cache-first for build assets, icons and photos (max 80), RSC payloads network-only (Next falls back to a full navigation offline), auth/API/MCP never cached, caches cleared on sign-out. Offline fallback `/hors-ligne`. Registered in production only. Bump `VERSION` in `sw.js` to drop old caches.
- **Install**: Android/Chrome uses `beforeinstallprompt` with our own button; iPhone gets a two-step Safari guide; the banner (signed-in, not installed) stays away 14 days once closed (localStorage, optional). After adding a recipe from a share link, the install offer appears.
- **Web Push**: VAPID keys in env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); `push_subscriptions` per device. Sent with `after()`: friends when a recipe is created (app or MCP), the sender when someone adds their shared recipe. On iPhone, push works only in the installed app (iOS 16.4+): the UI says so instead of offering a dead button.
- **Netlify**: functions run in us-east-2 (region change needs a paid plan) while Supabase is in the EU, so pages load data in one parallel round trip, layouts never block, and `loading.tsx` skeletons show instantly; `staleTimes.dynamic = 30`.
- **TypeScript 6.0, not 7.0**: typescript-eslint 8.x supports `<6.1`. Revisit when it supports TS 7.
- **ESLint 9.39**: ESLint 10 crashes `eslint-plugin-react` bundled with `eslint-config-next` 16.3.
- **Tailwind v4** chosen over CSS Modules (user decision), locked down to tokens.
- **Radius token names** are `--rayon-*` in `tokens.css` so Tailwind's `--radius-*` theme keys can point to them without a self-reference.
- The mockup still holds v3 names/values (`--cerise`, `--papier` #F6F2EC, Shantell Sans) overridden by v4: **the brief wins** (`--tomate`, `--fond` #F7F2EA, Bricolage Grotesque). Sprite illustrations were recoloured accordingly.
- Accessibility adjustments vs mockup: unchecked ingredient tick ring uses `encre-3` (3:1 non-text contrast) instead of `trait`; checked tiles don't fade text to 60% (would fail AA); text buttons, active tab use `tomate-dark`.
- Icon buttons are 48px (mockup: 44) to meet the 48px target rule.
- **AI is the user's own subscription, optional** (user decision, 2026-10-04): Popote pays for no AI call and stores no API key. ChatGPT: "Sign in with ChatGPT" button in-app (plan usage, OAuth), hidden until OpenAI grants access (waitlist; repo stays private for now). Claude: Anthropic forbids subscription use in third-party apps, so a Popote MCP connector added in the Claude app (also usable from ChatGPT). No personal API keys, no monthly quota; manual entry and JSON-LD link import work without AI. Brief §5 is the reference.
- Netlify: adapter not pinned (Netlify's recommendation); Node from `.nvmrc` (22).

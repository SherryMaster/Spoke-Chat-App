# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before making changes.

## Project

**Spoke** — a web chat client for OpenCode. Users bring their own OpenCode API key
(encrypted at rest); the app streams chat from OpenCode's hosted Zen / Go model
endpoints, syncs conversations across devices, and stores attachments in Vercel
Blob. Next.js 16 App Router, full-stack, deployed on Vercel.

Architecture and design decisions live in `docs/superpowers/specs/2026-06-22-opencode-chat-app-design.md`.
The task-by-task build log is in `docs/superpowers/plans/2026-06-22-opencode-chat-app.md`.
Refer to those when a change has non-obvious scope.

## Commands

```bash
npm run dev          # local dev server on :3000
npm run build        # production build (also runs typecheck via next)
npm run typecheck    # tsc --noEmit — run after every change
npm run lint         # next lint

npm test             # vitest run (unit + integration)
npm run test:watch   # vitest watch
npm run test:e2e     # playwright (needs dev server running; see playwright.config.ts webServer)

npm run db:generate  # generate a Drizzle migration from schema changes
npm run db:migrate   # apply generated migrations
npm run db:push      # push schema directly to DB (dev only)
npm run db:studio     # Drizzle Studio UI
```

**Run `npm run typecheck` after every change.** It's the fastest, most reliable
gate. `npm run lint` is secondary. The build (`npm run build`) catches the same
errors but is slower.

## Environment

`.env.local` must contain (copy from `.env.example`):

- `DATABASE_URL` — Neon Postgres connection string (required for auth, conversations, keys)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — Better Auth config
- `NEXT_PUBLIC_BETTER_AUTH_URL` — client-side base URL (must match `BETTER_AUTH_URL`)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — optional; leave blank to disable GitHub OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional; leave blank to disable Google OAuth
- `ENCRYPTION_KEY` — 32 bytes base64 (`openssl rand -base64 32`); used by `src/lib/crypto.ts`
- `BLOB_READ_WRITE_TOKEN` — from a Vercel Blob store (private); only needed for file attachments

Never commit `.env.local` (it's gitignored). Never log any of these values. The
`ENCRYPTION_KEY` protects user API keys at rest — rotating it invalidates every
stored key.

## Stack versions & version-specific quirks

This project pins specific majors with known gotchas. Don't assume APIs from
your training data — verify against the installed version.

- **Next.js 16.2** — `params` and `searchParams` are `Promise<...>` and must be `await`ed. `headers()` and `cookies()` are async. If unsure, read the guide in `node_modules/next/dist/docs/` (this is NOT the Next.js you know — the project was scaffolded against this version with breaking changes vs. Next 14/15).
- **React 19** — Server Components are the default; mark client components with `'use client'`.
- **Vercel AI SDK v6** (`ai@6.x`, `@ai-sdk/react@3.x`) — `convertToModelMessages()` returns a **Promise** and must be `await`ed (see `src/lib/opencode/stream.ts`). `useChat`'s transport is configured via `DefaultChatTransport` with `prepareSendMessagesRequest`. `streamText().consumeStream()` must be called on the server to keep the stream alive on client disconnect.
- **Drizzle ORM 0.45.x** + **drizzle-kit 0.31.x** — pinned because `better-auth@1.6` has a peer dep on `drizzle-orm@^0.45`. Do not bump to 1.0 without checking the Better Auth peer dep.
- **Better Auth 1.6** — Drizzle adapter via `drizzleAdapter(db, { provider: 'pg' })`. Schema is hand-defined in `src/db/schema.ts` (Better Auth's CLI `generate` is not used; the auth tables are kept in sync manually).
- **Zod 4** — used for validation; API differs from Zod 3 in some places.
- **shadcn/ui "base-nova" style** — uses `@base-ui/react` primitives (not Radix directly) plus `@radix-ui/react-slot` for `asChild`. Don't import from `@radix-ui/*` in app code; use the wrappers in `src/components/ui/`.
- **lucide-react 1.x** — major version (most projects are on 0.x). Import paths are unchanged.
- **Tailwind 4** — CSS-first config in `src/app/globals.css`, no `tailwind.config.ts`. Tokens come from shadcn's `@theme inline` block.

## Project structure

```
src/
  app/                            Next.js App Router
    layout.tsx                    root: fonts, ThemeProvider, Toaster, suppressHydrationWarning
    page.tsx                      landing (public) — redirects to /chat if signed in
    (auth)/sign-in|sign-up/page.tsx   auth pages (route group)
    onboarding/page.tsx           paste + verify OpenCode API key
    chat/
      layout.tsx                  auth + key gate (redirects to /sign-in or /onboarding)
      page.tsx                    empty state
      [id]/page.tsx               conversation (server) → renders <ChatView/>
    settings/page.tsx
    api/
      auth/[...all]/route.ts      Better Auth catch-all
      chat/route.ts               stream chat (the only OpenCode-calling route)
      models/route.ts             cached model list for the signed-in user
      conversations/route.ts      list + create
      conversations/[id]/route.ts patch (title/systemPrompt/modelId) + soft-delete
      conversations/[id]/messages/route.ts
      conversations/[id]/export/route.ts  download as Markdown
      search/route.ts             title ilike + message parts ILIKE
      user-key/route.ts           POST (save/verify), GET (fingerprint), DELETE
                                  ALSO exports loadDecryptedKey(userId)
      upload-token/route.ts       Vercel Blob upload endpoint
      attachments/[id]/route.ts   auth-gated redirect to private blob URL
      attachments/by-url/route.ts
  components/
    app/         chat UI (ChatView, Sidebar, Composer, MessageBubble, ModelPicker, ...)
    auth/        sign-in/up forms, OAuth buttons
    onboarding/  API key form
    landing/     hero, features, CTA
    ui/          shadcn primitives (generated; base-nova style — double-quoted)
  db/
    schema.ts    single Drizzle schema — Better Auth core + app tables
  lib/
    auth.ts          betterAuth() instance, Drizzle adapter, OAuth providers
    auth-client.ts   createAuthClient — signIn/signUp/signOut/useSession
    db.ts            drizzle(sql, { schema }) over neon-http
    crypto.ts        AES-256-GCM encryptKey/decryptKey/keyFingerprint
    ai/types.ts      ChatUIMessage = UIMessage<{ model?, totalTokens?, ... }>
    opencode/
      models.ts      mergeModels + tagModel (free|zen|go) — pure, unit-tested
      fetch.ts       fetchModelsForUser — hits zen + go /models in parallel
      provider.ts    getOpenCodeModel(id, key, meta) — dispatches to AI SDK provider
      stream.ts      streamConversation — load history, persist user msg, streamText, persist assistant
    utils.ts         cn() helper (clsx + tailwind-merge)
tests/
  unit/          crypto, models, provider
  integration/   conversations (hits real DB)
  e2e/           playwright smoke
drizzle/         generated migrations
drizzle.config.ts
```

## Conventions

### File names

- Folders & route files: kebab-case (`user-key`, `sign-in`, `upload-token`)
- Components in `components/app|auth|landing|onboarding/`: **PascalCase** (`ChatView.tsx`)
- Components in `components/ui/`: **kebab-case** (`dropdown-menu.tsx`) — shadcn-generated, leave as-is
- lib files: kebab-case (`auth-client.ts`); subfolders group by domain
- Single Drizzle schema at `src/db/schema.ts`

### Server vs client components

- Default is server. Mark interactive components with `'use client'` at the top.
- Server components do auth + DB loads and pass plain props to client components.
  Example: `src/app/chat/[id]/page.tsx` loads conversation + messages, then renders `<ChatView id initialMessages initialModelId initialSystemPrompt />`.
- The client component owns streaming state only — it does not re-fetch history
  on navigation. The server is the source of truth; the client reconstructs from
  `initialMessages`.

### API route shape

Every API route in this repo follows the same skeleton — match it:

```ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'        // required for node:crypto + neon-http
export const maxDuration = 60          // only on long routes (chat); 30 on models

export async function GET(_req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // scope every query by session.user.id
}
```

- **Auth check**: always `await auth.api.getSession({ headers: await headers() })`. No exceptions in API routes; return `{ error: 'Unauthorized' }, status: 401` on miss.
- **Data scoping**: every DB query is filtered by `session.user.id`. For owned single resources use a `loadOwned(id, userId)` helper (see `conversations/[id]/route.ts`) and return 404 if null. This prevents IDOR.
- **Soft delete**: `DELETE` sets `deletedAt: new Date()`, never removes the row. List queries filter `isNull(deletedAt)`.
- **Dynamic params (Next 16)**: `params: Promise<{ id: string }>` → `const { id } = await params`.
- **Errors**: `NextResponse.json({ error: '...' }, { status: <code> })`. Common codes: 401, 400, 404, 412 (no API key, `code: 'no_key'`), 502 (OpenCode unreachable).
- **Shared helpers across routes**: export them from a route module and import. `loadDecryptedKey` lives in `src/app/api/user-key/route.ts` and is imported by `/api/chat` and `/api/models`.

### Streaming chat (the one unusual route)

`POST /api/chat` receives `{ id: conversationId, message: <last UIMessage only> }`.
History is NOT sent from the client — the server reloads it from the DB. The
client's `prepareSendMessagesRequest` reshapes the payload this way (see
`ChatView.tsx`).

Server flow (`src/app/api/chat/route.ts` + `src/lib/opencode/stream.ts`):

1. `getSession` → 401.
2. `loadDecryptedKey(userId)` → 412 `code: 'no_key'` if absent.
3. `streamConversation({ userId, conversationId, apiKey, newUserMessage })`:
   - load conversation scoped by `(id, userId)` → throw `NOT_FOUND`
   - load all messages → map to `ChatUIMessage[]`
   - **insert the user message row immediately** (before streaming) and use its DB id
   - `fetchModelsForUser(apiKey)` → find model meta by `conv.modelId` → throw `MODEL_NOT_AVAILABLE`
   - persist `file` parts to `messageAttachment`
   - `streamText({ model: getOpenCodeModel(...), system: conv.systemPrompt ?? undefined, messages: await convertToModelMessages(all) })`
4. `stream.result.consumeStream()` — **always call this** so the stream completes even if the client disconnects.
5. Return `result.toUIMessageStreamResponse({ generateMessageId, originalMessages: [body.message], onFinish, onError })`:
   - `onFinish` calls `stream.persist(responseMessage)` — inserts the assistant message with `metadata: { durationMs }`.
   - `onError` redacts anything matching `/sk-[a-zA-Z0-9_-]+/g` to `sk-…REDACTED` before returning.

### OpenCode provider dispatch

`src/lib/opencode/provider.ts` is the single point that maps a model id to a
Vercel AI SDK provider instance. Don't duplicate this logic elsewhere.

| Model id | Provider | baseURL |
|---|---|---|
| `claude-*` | `createAnthropic` | `https://opencode.ai/zen/v1` |
| `gpt-*`, `o[1-9]-` | `createOpenAICompatible` (name: `opencode-zen-openai`) | `.../zen/v1/responses` |
| `gemini-*` | `createOpenAICompatible` (name: `opencode-zen-google`) | `.../zen/v1/chat/completions` |
| anything else | `createOpenAICompatible` (name: `opencode-zen-compat`) | `.../zen/v1/chat/completions` |

Model discovery: `fetchModelsForUser(key)` calls **both** `.../zen/v1/models` and
`.../zen/go/v1/models` via `Promise.allSettled`, then `mergeModels` tags each as
`free` (all-zero pricing), `zen` (paid Zen), or `go` (subscription-only). The
`<ModelPicker>` groups by category and disables Go models if `hasGo === false`.

If a new model family appears, add a matcher branch here — not at call sites.

### Database (Drizzle + Neon HTTP)

- Client: `src/lib/db.ts` uses `drizzle-orm/neon-http` over `@neondatabase/serverless`.
- Schema: single file `src/db/schema.ts`. Better Auth tables (`user`, `account`,
  `session`, `verification`) have `text` PKs; app tables (`userKey`,
  `conversation`, `message`, `messageAttachment`) use `uuid().primaryKey().defaultRandom()`.
- All FKs are `onDelete: 'cascade'`. App tables use snake_case columns.
- `userKey.userId` is `.unique()` — one key per user, upserted via `onConflictDoUpdate`.
- `message.parts` and `message.metadata` are `jsonb` — never query inside them;
  always read/write the whole array.
- `conversation.deletedAt` enables soft delete.
- Query style: drizzle query builder (`db.select().from(...).where(...)`), not raw SQL. Operators from `drizzle-orm` (`eq`, `and`, `desc`, `asc`, `isNull`). Raw `sql\`...\`` is only for full-text search in `api/search/route.ts`.

To change the schema: edit `src/db/schema.ts`, run `npm run db:generate`, review
the generated SQL in `drizzle/`, then `npm run db:push` (dev) or `db:migrate`
(shared). Never hand-edit migration files after they're committed.

### Encryption

`src/lib/crypto.ts` is the only place plaintext API keys live (briefly, in a
function-local variable). It uses AES-256-GCM with a 12-byte random IV per
encrypt. The master key comes from `ENCRYPTION_KEY` (base64, 32 bytes). `loadDecryptedKey(userId)`
in `user-key/route.ts` is the single read path used by `/api/chat` and
`/api/models`. Never log a decrypted key, never return it in an API response,
never store it outside `userKey.encryptedKey` + `iv` + `authTag`.

### Testing

- Unit tests live in `tests/unit/` — pure logic (crypto, model tagging, provider
  routing). Run with `npm test`.
- Integration tests in `tests/integration/` hit the **real DB** via `db`. They
  create a throwaway `user` row in `beforeAll` and clean up in `afterAll`. If
  `DATABASE_URL` doesn't point at a live Neon DB, these are expected to fail —
  that's OK for local; CI provides the DB.
- E2E in `tests/e2e/` uses Playwright with `playwright.config.ts`'s `webServer`
  starting `npm run dev`.
- `vitest.config.ts` sets environment `node` (not jsdom) and aliases `@` → `./src`.
- Prefer adding a unit test for new pure logic (tagging, routing, crypto). For
  API routes, an integration test that hits the DB is the right level.

### shadcn/ui

- Style is `"base-nova"` → primitives come from `@base-ui/react`, not Radix
  directly. `asChild` uses `@radix-ui/react-slot`. Don't fight this; if a
  component needs a primitive not in `@/components/ui/`, add it via
  `npx shadcn@latest add <name>`.
- `components/ui/*` is generated code — double-quoted, sometimes semicolon-free.
  Leave the style alone unless you're fixing a bug.
- App code uses single quotes and is semicolon-consistent within a file.
- `cn()` from `@/lib/utils` (clsx + tailwind-merge) is the only className helper.

## Common tasks

**Add an API route:** create `src/app/api/<resource>/route.ts` exporting `GET`/`POST`/etc. Start with `export const runtime = 'nodejs'`, do the `getSession` → 401 guard, scope all queries by `session.user.id`, return `NextResponse.json({ error }, { status })` on failure. For owned resources use a `loadOwned(id, userId)` helper → 404 if null.

**Add a client component:** `'use client'` at top, import hooks from `@ai-sdk/react` / `ai` / `next/navigation`, use `cn` for classes, shadcn primitives from `@/components/ui/*`.

**Add a DB table:** add a `pgTable` to `src/db/schema.ts`, `uuid().primaryKey().defaultRandom()` for app tables, snake_case columns, `references(() => x.id, { onDelete: 'cascade' })`, add indexes via the table callback. Run `npm run db:generate` then `db:push` (dev) or `db:migrate` (shared).

**Add a model provider branch:** extend `getOpenCodeModel` in `src/lib/opencode/provider.ts` with a new matcher choosing the right `create*` factory + baseURL. Don't add dispatch elsewhere.

**Change the schema:** edit `src/db/schema.ts` → `npm run db:generate` → review `drizzle/<new>.sql` → `npm run db:push` (dev) or `db:migrate` (shared). Never hand-edit committed migrations.

## Don't

- Don't log or return decrypted API keys, `ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, or bearer tokens.
- Don't query inside `message.parts` (jsonb) — read/write the whole array.
- Don't hard-delete conversations — set `deletedAt`.
- Don't skip the `getSession` + user-scoping in API routes (IDOR risk).
- Don't import from `radix-ui/*` directly in app code — use `@/components/ui/*`.
- Don't bump `drizzle-orm` past 0.45 without checking `better-auth`'s peer dep.
- Don't `await` `convertToModelMessages` only sometimes — it always returns a Promise in v6.
- Don't add `comments` to source files unless explaining a non-obvious invariant. Code is self-documenting.
- Don't reintroduce browser-extension `bis_*` / `__processed_*` hydration noise — `<html suppressHydrationWarning>` in `layout.tsx` handles it intentionally.

## Before you start

If a change touches auth, streaming, encryption, or the OpenCode provider
dispatch, read the corresponding file end-to-end first. These four areas have
invariants (auth scoping, `consumeStream` + `onFinish` persistence, GCM auth tag,
single dispatch point) that are easy to break silently. The design spec at
`docs/superpowers/specs/2026-06-22-opencode-chat-app-design.md` explains *why*.
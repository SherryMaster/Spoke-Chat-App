# Spoke

> A web chat client for OpenCode. Bring your own API key. Every model, every device.

Spoke is a multi-user chat app for [OpenCode](https://opencode.ai) — the hosted model
service from the makers of the OpenCode CLI. You sign in, paste your OpenCode API key,
and get a streaming chat interface to every model OpenCode offers (Zen paid, Zen free,
Go subscription), with your conversations synced across devices and your key encrypted
at rest.

It's a personal alternative to ChatGPT-style clients, built for developers who already
use the OpenCode CLI and want a browser-based interface with the same billing.

## Features

- 🔐 **Bring your own key** — paste your OpenCode API key once; it's encrypted with
  AES-256-GCM and stored in Postgres. Decrypted only in memory, only inside `/api/chat`.
- 🌐 **Every model** — picks up every model your key is entitled to: OpenCode Go
  subscription models, Zen paid models, and Zen free models. Single picker, grouped
  by category.
- 💬 **Streaming** — token-by-token streaming via the Vercel AI SDK v6. Stop
  button, regenerate, full conversation history.
- 🖥️ **Cross-device** — sign in anywhere, your conversations follow you. Sessions
  stored in Postgres via Better Auth.
- 🧠 **Per-conversation system prompt** — set custom instructions per chat.
- 🔍 **Search** — `Cmd/Ctrl+K` palette, full-text search across all your messages
  and chat titles.
- 📎 **File attachments** — drag/drop files into the composer; stored in a private
  Vercel Blob store and served through an auth-gated proxy.
- 📄 **Export** — download any conversation as Markdown.
- 🌓 **Theme** — light, dark, or system.

## Tech stack

- **Next.js 16** (App Router, RSC, Turbopack)
- **TypeScript** strict mode
- **Better Auth** v1.6 — email/password + GitHub + Google OAuth
- **Drizzle ORM** 0.45 over **Neon Postgres** (HTTP driver)
- **Vercel AI SDK v6** — `useChat` + `streamText` for streaming
- **shadcn/ui** "base-nova" style + Tailwind CSS 4
- **Streamdown** for Markdown with Shiki code highlighting
- **Vercel Blob** (private) for file attachments
- **Vitest** for unit tests, **Playwright** for E2E
- Deployed on **Vercel**

## Quick start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database (free tier is enough)
- An [OpenCode](https://opencode.ai/auth) API key

### Setup

```bash
git clone https://github.com/<your-username>/spoke.git
cd spoke
npm install
cp .env.example .env.local
```

Fill in `.env.local` (see [Configuration](#configuration) below for each variable's
source), then:

```bash
npx drizzle-kit push    # create database tables
npm run dev             # start the dev server on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000), sign up, paste your OpenCode API
key on the onboarding screen, and you're in.

## Configuration

All env vars go in `.env.local` (gitignored). See `.env.example` for the full list.

| Variable | Required | Where to get it |
|---|---|---|
| `DATABASE_URL` | Yes | [console.neon.tech](https://console.neon.tech) → your project → "Connect" |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | `http://localhost:3000` (dev) or `https://<your-domain>` (prod) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | [github.com/settings/developers](https://github.com/settings/developers) → OAuth App; callback `https://<domain>/api/auth/callback/github` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth Client ID; callback `https://<domain>/api/auth/callback/google` |
| `ENCRYPTION_KEY` | Yes | `openssl rand -base64 32` (separate from the auth secret) |
| `BLOB_READ_WRITE_TOKEN` | For attachments | Create a Vercel Blob store, then `npx vercel env pull` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server on `:3000` |
| `npm run build` | Production build (also runs typecheck) |
| `npm run typecheck` | `tsc --noEmit` — run after every change |
| `npm run lint` | Next.js lint |
| `npm test` | Vitest unit + integration tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E (boots the dev server automatically) |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:push` | Push schema directly to DB (dev only) |
| `npm run db:studio` | Drizzle Studio UI for inspecting data |

## Architecture

```
Browser
  │  HTTPS (RSC, server actions, REST, SSE streams)
  ▼
Next.js 16 on Vercel
  ├─ App Router pages (/, /sign-in, /sign-up, /onboarding, /chat, /chat/[id], /settings)
  ├─ API routes (Better Auth, /api/chat, /api/conversations, /api/models, ...)
  └─ Server modules
       ├─ lib/auth.ts          — Better Auth instance (Drizzle adapter, OAuth)
       ├─ lib/db.ts            — Drizzle client over Neon HTTP
       ├─ lib/crypto.ts        — AES-256-GCM encrypt/decrypt of API keys
       ├─ lib/opencode/
       │    ├─ models.ts       — fetch + tag available models (free|zen|go)
       │    ├─ provider.ts     — getOpenCodeModel(id, key) → AI SDK model
       │    └─ stream.ts       — wrap streamText with persistence
       └─ lib/ai/types.ts      — shared UIMessage types

   Postgres (Neon)            Vercel Blob
   user, account, session     private attachments
   user_key (encrypted)
   conversation, message,
   message_attachment
```

**The OpenCode provider dispatch** (`src/lib/opencode/provider.ts`) is the only place
that maps a model id (e.g. `claude-sonnet-4-6`, `gpt-5.4`, `kimi-k2.7`) to the right
Vercel AI SDK provider. The OpenCode API is heterogeneous — different model families
live at different endpoint paths — so the dispatch is non-trivial:

| Model id | AI SDK provider | baseURL |
|---|---|---|
| `claude-*` | `createAnthropic` | `https://opencode.ai/zen/v1` |
| `gpt-*`, `o[1-9]-` | `createOpenAICompatible` | `…/zen/v1/responses` |
| `gemini-*` | `createOpenAICompatible` | `…/zen/v1/chat/completions` |
| anything else | `createOpenAICompatible` | `…/zen/v1/chat/completions` |

The full design spec is in [`docs/superpowers/specs/2026-06-22-opencode-chat-app-design.md`](docs/superpowers/specs/2026-06-22-opencode-chat-app-design.md).

## Project structure

```
src/
  app/                        Next.js App Router (pages + API routes)
  components/
    app/                      chat UI (ChatView, Sidebar, Composer, ModelPicker, ...)
    auth/                     sign-in / sign-up forms
    landing/                  landing page components
    onboarding/               API key form
    ui/                       shadcn primitives (generated, base-nova)
  db/schema.ts                Drizzle schema — Better Auth + app tables
  lib/
    auth.ts                   betterAuth() instance
    auth-client.ts            React client (signIn/signUp/signOut/useSession)
    crypto.ts                 AES-256-GCM
    db.ts                     Drizzle client (neon-http)
    ai/types.ts               ChatUIMessage = UIMessage<metadata>
    opencode/
      models.ts               mergeModels + tagModel
      fetch.ts                fetchModelsForUser (zen + go /models)
      provider.ts             getOpenCodeModel dispatch
      stream.ts               streamConversation
    utils.ts                  cn() (clsx + tailwind-merge)
tests/
  unit/                       crypto, models, provider
  integration/                conversations (real DB)
  e2e/                        playwright smoke
drizzle/                      generated migrations
docs/superpowers/
  specs/                      design spec
  plans/                      implementation plan
```

## Deployment

Spoke is built for Vercel.

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new) — auto-detects Next.js
3. Set the env vars in **Project → Settings → Environment Variables** (Production,
   Preview, and Development as needed)
4. Create a **Vercel Blob** store in **Storage → Create Database → Blob** with
   **Private** access mode — this auto-adds `BLOB_READ_WRITE_TOKEN`
5. Deploy

For local dev with the same Blob store, `npx vercel env pull` to sync the token
into your `.env.local`.

## Development

Read [`AGENTS.md`](AGENTS.md) for the agent-oriented conventions: the canonical
patterns for adding API routes, the streaming chat flow, the auth + user-scoping
invariant, the OpenCode provider dispatch, and version-specific quirks of the
pinned stack (Next 16 async params, AI SDK v6 async `convertToModelMessages`,
Drizzle 0.45 peer dep with Better Auth, shadcn base-nova, etc.).

A few quick rules of thumb:

- `npm run typecheck` after every change. It's the fastest gate.
- Every API route does `await auth.api.getSession(...)` and scopes every DB query
  by `session.user.id`. No exceptions.
- `src/lib/crypto.ts` is the only place plaintext API keys live, briefly, in a
  function-local variable. Never log a decrypted key, never return it in an API
  response.
- For new model families, add a branch to `getOpenCodeModel`. Don't dispatch
  providers anywhere else.

## License

MIT

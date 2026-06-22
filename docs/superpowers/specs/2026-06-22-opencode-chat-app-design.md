# OpenCode Chat App — Design

**Date:** 2026-06-22
**Status:** Approved (pending final user review)
**Author:** Brainstorming session

## 1. Overview

A multi-user AI chat web app. Users bring their own OpenCode API key (from `opencode.ai/auth`). The app stores the key encrypted server-side, syncs conversation history across devices, and routes chat requests to the appropriate OpenCode Zen or OpenCode Go endpoint depending on the model the user picks.

OpenCode's hosted APIs (`opencode.ai/zen/v1`, `opencode.ai/zen/go/v1`) are heterogeneous: Anthropic models go to `/messages`, OpenAI models to `/responses`, Gemini to per-model paths, and everything else (Claude-via-Anthropic excepted, plus Kimi, GLM, Qwen, DeepSeek, MiniMax, free models) to `/chat/completions`. The app dispatches per model.

The target user is a developer (the requester) who wants a personal ChatGPT-style interface that uses the same billing/auth as the OpenCode CLI, with full control over which models they use.

## 2. Goals

- One account works across any device (web app, cross-device session sync).
- The OpenCode API key never appears in plaintext outside the encrypted DB row.
- Streaming responses from the AI show up token-by-token in the UI.
- Multi-conversation with full history, search, export, and per-conversation system prompts.
- Deployable to Vercel with Neon Postgres and Vercel Blob; no other infrastructure required.

## 3. Non-Goals (YAGNI for v1)

- Folders, tags, or pinning of conversations
- Sharing conversations publicly (the OpenCode CLI has `/share`; we don't expose it)
- Voice input / output
- Tool calling, function calling, agent loops (the requester did not ask for them)
- Branching conversations
- Per-message model override (model is set per conversation)
- Real-time multi-device cursors / collaborative editing
- Internationalization
- Tool/plugin ecosystem (MCP servers, custom tools)

## 4. Tech Stack (current versions, verified June 2026)

| Layer | Choice | Version / notes |
|---|---|---|
| Framework | Next.js | 16.2.x (App Router, RSC, Turbopack) |
| Language | TypeScript | strict mode |
| Auth | Better Auth | v1.6 — successor to Auth.js, officially recommended for new projects |
| Database | Neon Postgres | serverless, free tier covers personal use |
| ORM | Drizzle ORM | 1.0 RC, with `drizzle-orm/neon-http` driver via `@neondatabase/serverless` |
| Migrations | drizzle-kit | `generate` + `migrate` |
| AI / streaming | Vercel AI SDK | v6 (`ai` + `@ai-sdk/react`) — `useChat`, `streamText`, `convertToModelMessages` |
| Markdown render | Streamdown | `streamdown` package, with `@streamdown/code` plugin (Shiki-based) |
| UI components | shadcn/ui | current (copy-paste components, owns the code) |
| Styling | Tailwind CSS | v4 |
| File storage | Vercel Blob | `@vercel/blob`, server uploads via `put()` |
| Hosting | Vercel | Hobby/Pro |
| Theme | next-themes | light/dark/system |
| Testing | Vitest | unit + integration, with Playwright for E2E |

The OpenCode community has an `ai-sdk-provider-opencode-sdk` that targets a running `opencode serve` process. We are **not** using it — we call OpenCode's hosted APIs directly, which is the documented use case for any non-CLI client.

## 5. Architecture

### 5.1 Top-level layout

```
Browser
  │
  │ HTTPS (RSC, server actions, REST, SSE streams)
  ▼
Next.js 16 on Vercel
  ├─ App Router pages (/, /sign-in, /sign-up, /onboarding, /chat, /chat/[id], /settings)
  ├─ API routes (/api/auth/* via Better Auth, /api/chat/* for AI, /api/conversations, /api/models, /api/search)
  └─ Server modules
       ├─ lib/auth.ts          — Better Auth instance (Drizzle adapter, email+password, GitHub, Google)
       ├─ lib/db.ts            — Drizzle client over Neon HTTP
       ├─ lib/crypto.ts        — AES-256-GCM encrypt/decrypt of API keys
       ├─ lib/opencode/
       │    ├─ models.ts       — fetch + cache available models for a user
       │    ├─ provider.ts     — getOpenCodeModel(id, key) → AI SDK model
       │    └─ stream.ts       — wrap streamText with metadata, persist on finish
       └─ lib/ai/types.ts      — UIMessage types, shared with client
       │
       ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Postgres (Neon)                                             │
   │  user, account, session, verification  — Better Auth core   │
   │  user_key                              — encrypted API key  │
   │  conversation, message, message_attachment                 │
   └─────────────────────────────────────────────────────────────┘

   Vercel Blob: file attachments (private or public bucket — see §10.2)

Browser → OpenCode Zen / Go (during streaming only)
  Next.js proxies the user's decrypted key in a server-to-server call.
  The browser never sees the OpenCode key.
```

### 5.2 Request flow — first message in a new conversation

1. User signs in, completes onboarding (enters + verifies OpenCode key).
2. User clicks "New chat", picks a model from the picker, types a message.
3. Client `useChat` POSTs the message + conversation id to `/api/chat`.
4. API route:
   - Confirms Better Auth session.
   - Loads the user's encrypted key, decrypts in memory.
   - Loads all prior messages for the conversation from DB.
   - Resolves the AI SDK model via `getOpenCodeModel(modelId, key)` (see §6.2).
   - Persists the new user message row.
   - Calls `streamText({ model, system: conversation.systemPrompt, messages: convertToModelMessages(history) })`.
   - Returns `result.toUIMessageStreamResponse()` with `onFinish` that persists the assistant message (with token usage metadata) and triggers title generation if the conversation is new.
5. Browser streams the response into the chat UI.
6. On client `onFinish`, the client also kicks off background title generation if needed.

### 5.3 Module boundaries

- `lib/auth` knows about users, sessions, OAuth. Nothing else imports it.
- `lib/db` is the only place Drizzle client construction happens; everything else imports the typed `db` and schema.
- `lib/crypto` is the only place encryption touches plaintext. The plaintext key lives in a function-local variable and is not exported.
- `lib/opencode/*` is the only place that talks to OpenCode APIs. The `/api/chat` route is the only consumer.
- `lib/opencode/provider.ts` is the single point where "model id → AI SDK provider" is decided. The dispatch table is the only piece that has to change when OpenCode adds new model families.

## 6. OpenCode Integration

### 6.1 Fetching the model list

Endpoint: `GET https://opencode.ai/zen/v1/models` (and `…/zen/go/v1/models`) with the user's key as `Authorization: Bearer <key>`.

For each user, the app fetches both lists in parallel, merges by model id, and tags each model with a category:
- `go` — model is in the Go list but not Zen (subscription required)
- `free` — input, output, and cached prices are all `$0`
- `zen` — otherwise (paid Zen model)

Result is cached per user in a process-local LRU with a 5-minute TTL. Cache key includes the user's key fingerprint (first 8 chars of SHA-256), not the key itself.

The user's "Go subscription" status is implied by whether the `/zen/go/v1/models` call returns a non-empty list with the user's key. The `<ModelPicker>` disables the "Go" group header (and shows "Subscribe at opencode.ai/auth" hint) when no Go models came back; individual Go models in the merged list are still returned so the user sees what they're missing.

If a model is selected by the user but not in the cached list (e.g., the user just subscribed to Go), the next `/api/chat` call fetches fresh, and a 5-minute cooldown kicks in.

### 6.2 Provider dispatch

`getOpenCodeModel(modelId, key): LanguageModel` reads the model's `endpoint` field from the cached list and returns the right AI SDK provider instance:

| Model id pattern | Endpoint | AI SDK provider |
|---|---|---|
| `claude-*` | `https://opencode.ai/zen/v1/messages` | `@ai-sdk/anthropic` with `baseURL: 'https://opencode.ai/zen/v1'` |
| `gpt-*`, `o1-*`, `o3-*`, `o4-*` | `https://opencode.ai/zen/v1/responses` | `@ai-sdk/openai` with `baseURL: 'https://opencode.ai/zen/v1'` |
| `gemini-*` | `https://opencode.ai/zen/v1/models/gemini-{id}` | `@ai-sdk/google` with `baseURL: 'https://opencode.ai/zen/v1'` and per-request `model` override; the path-baked model id is handled by setting `baseURL` to the parent and passing the full model id |
| anything else | `https://opencode.ai/zen/v1/chat/completions` | `createOpenAICompatible({ name: 'opencode', baseURL: 'https://opencode.ai/zen/v1', apiKey: key })` |

All four provider types implement the Vercel AI SDK `LanguageModelV3` interface, so `streamText({ model: getOpenCodeModel(...), ... })` works uniformly.

### 6.3 Streaming details

- API route exports `export const maxDuration = 60;` (Vercel Pro) / `export const runtime = 'nodejs';` (longer than edge default).
- `streamText` is called with `abortSignal` taken from the request, so a client disconnect (or stop button) aborts the upstream OpenCode call.
- `messageMetadata` is attached on `finish`: `{ model, totalTokens, inputTokens, outputTokens, cachedTokens, durationMs }`.
- `onError` in the response is set to a function that returns the OpenCode error message verbatim, but redacts any text that looks like a bearer token (defense in depth — the key should never end up in error bodies, but we sanitize anyway).

### 6.4 Title generation

When a conversation has no `title` and exactly one user message, the assistant's `onFinish` triggers a one-shot background call:
- Uses a cheap model (Claude Haiku 4.5 or a free model) with a 2k token limit and a fixed system prompt: "Summarize this user message in 5 words or fewer, no punctuation, no quotes."
- Writes the result to `conversation.title`.
- If the call fails, leaves the title null and the sidebar shows "New chat".

## 7. Data Model

Drizzle schema (PostgreSQL, snake_case column names, camelCase TS names):

```ts
// user, account, session, verification — generated by `npx @better-auth/cli generate`
// with the Drizzle adapter pointed at our schema file. Field names per Better Auth core.

user_key {
  id              uuid pk
  userId          text fk → user.id (unique — one key per user for v1)
  encryptedKey    bytea            -- AES-256-GCM ciphertext
  iv              bytea            -- 12 bytes
  authTag         bytea            -- 16 bytes
  keyFingerprint  text             -- "sk-…1234" first 4 + last 4, for display only
  verifiedAt      timestamptz
  createdAt       timestamptz
  updatedAt       timestamptz
}

conversation {
  id            uuid pk
  userId        text fk → user.id
  title         text               -- null until generated
  modelId       text               -- e.g. "claude-sonnet-4-6", "gpt-5.4"
  systemPrompt  text               -- nullable
  createdAt     timestamptz
  updatedAt     timestamptz
  deletedAt     timestamptz        -- soft delete; null = active
  // index (userId, updatedAt desc)
}

message {
  id              uuid pk
  conversationId  uuid fk → conversation.id
  role            text             -- 'user' | 'assistant' | 'system'
  parts           jsonb            -- AI SDK 6 UIMessage.parts (text, file, reasoning, …)
  modelId         text             -- nullable for system messages
  metadata        jsonb            -- { totalTokens, inputTokens, outputTokens, durationMs, … } on assistant
  createdAt       timestamptz
  // index (conversationId, createdAt)
}

message_attachment {
  id          uuid pk
  messageId   uuid fk → message.id
  filename    text
  mimeType    text
  sizeBytes   integer
  blobUrl     text             -- Vercel Blob URL
  createdAt   timestamptz
}
```

### 7.1 Why JSONB for `message.parts`

AI SDK 6's `UIMessage.parts` is a stable discriminated union (`type: 'text' | 'file' | 'reasoning' | 'source-url' | 'source-document' | 'data-*' | ...`). We always read and write the whole array in one go, never query inside it, so JSONB is the right shape. If we later need full-text search inside messages we can add a generated tsvector column.

### 7.2 API key encryption

`lib/crypto.ts`:
- `encryptKey(plaintext: string): { ciphertext, iv, authTag }` — random 12-byte IV per encryption, AES-256-GCM.
- `decryptKey({ ciphertext, iv, authTag }): string` — throws on auth-tag mismatch.
- Master key is `process.env.ENCRYPTION_KEY` (32 bytes, base64). Generated once with `openssl rand -base64 32` and stored as a Vercel env var. Never committed, never logged.
- `keyFingerprint` is computed at save time as `sk-…XXXX` (first 4 + last 4 of the key) and stored alongside — used only for display ("key ending in 1a2b"), never for any cryptographic operation.
- The plaintext key is held in a function-local variable inside the `/api/chat` route handler; it is never returned to the client, never logged, never written to disk.

## 8. Pages

| Path | Type | Purpose |
|---|---|---|
| `/` | Public | Landing page: hero, three feature blocks, sign-in / get-started CTAs. Redirects to `/chat` if signed in. |
| `/sign-in` | Public | Email + password, GitHub, Google. |
| `/sign-up` | Public | Same, plus "Already have an account?" link. |
| `/onboarding` | Authed, no key | Paste OpenCode API key, "Test connection" button. Shows the `keyFingerprint` on success. Redirects to `/chat`. |
| `/chat` | Authed + key | Empty state: "Start a new conversation". Sidebar visible. |
| `/chat/[id]` | Authed + key | Active conversation. Loads messages on the server, hydrates `useChat`. |
| `/settings` | Authed | Re-enter / delete API key, theme toggle, sign out. |

The landing page (`/`) is a public marketing page. It uses Tailwind, shadcn `Button`, and renders three feature blocks: "BYO key" (encrypted, your control), "Every model" (Go + Zen + free), "Cross-device" (sign in anywhere, pick up where you left off).

## 9. API Surface

| Method | Path | Purpose |
|---|---|---|
| * | `/api/auth/[...all]` | Better Auth handler. |
| POST | `/api/chat` | Stream chat. Body: `{ id, message, trigger }` (AI SDK transport). Reads user's key, dispatches model, streams. |
| GET | `/api/conversations` | List active conversations for the signed-in user, ordered by `updatedAt desc`. |
| POST | `/api/conversations` | Create. Body: `{ modelId, systemPrompt? }`. Returns `{ id }`. |
| PATCH | `/api/conversations/[id]` | Update title, systemPrompt, modelId. |
| DELETE | `/api/conversations/[id]` | Soft delete (sets `deletedAt`). |
| POST | `/api/conversations/[id]/restore` | Clear `deletedAt`. |
| GET | `/api/conversations/[id]/messages` | Load history for a conversation. |
| POST | `/api/conversations/[id]/messages` | Persist a user message (used by `useChat` `prepareSendMessagesRequest`). |
| GET | `/api/models` | Cached model list for the signed-in user. |
| GET | `/api/search?q=…` | Full-text search over the user's messages and conversation titles. Implemented with Postgres `to_tsvector('english', parts_text) @@ plainto_tsquery('english', $1)` for messages and `ilike` for titles; returns a ranked list of `{ conversationId, messageId, snippet }`. |
| GET | `/api/conversations/[id]/export` | Download a conversation as Markdown. |

Every `/api/*` route (except `/api/auth/*`) runs a Better Auth session check first and scopes every query to `userId` from the session.

## 10. UI Components

```
src/components/
  landing/         — <Hero>, <FeatureBlocks>, <CTASection>
  auth/            — <SignInForm>, <SignUpForm>, <OAuthButtons>
  onboarding/      — <ApiKeyForm>, <ConnectionTestButton>
  app/
    <AppShell>          — sidebar + main area, used by /chat/* and /settings
    <Sidebar>           — chat list, search, new-chat button, user menu
    <ChatView>          — message list + composer
    <MessageBubble>     — renders parts: text → Streamdown, code → @streamdown/code, files → preview
    <Composer>          — textarea, attachment dropzone, send / stop button
    <ModelPicker>       — grouped: Free, Zen, Go (Go disabled if user not subscribed)
    <SystemPromptEditor>— collapsible drawer, per-conversation
    <SearchPalette>     — Cmd/Ctrl+K, fuzzy search over chats and messages
    <SettingsPage>      — re-enter / delete key, theme, sign out
```

### 10.1 Message rendering

- Text parts → `Streamdown` with `isAnimating={status === 'streaming'}` for caret + animation.
- Code blocks → `@streamdown/code` plugin (Shiki, copy + download buttons, language detection).
- File/image parts → thumbnail (images) or icon + filename (others). Click opens in a new tab.
- Reasoning parts → collapsible "Thought for 2.3s" disclosure (when present, e.g. for DeepSeek R-class models).

### 10.2 Attachments

- User drags or pastes a file into the composer.
- Client uploads directly to Vercel Blob using the `@vercel/blob/client-upload` flow: POST to `/api/upload-token` → server returns a short-lived `clientPayload` token → client `upload()` calls Blob directly with the token.
- Blob store is **private** (Vercel Blob has a hard private/public choice at store-creation time). The `message_attachment.blobUrl` is a private URL; the API route serves attachments via `/api/attachments/[id]` after a session + ownership check. Trade-off: one extra hop, but no public URLs leak.
- Limit: 25 MB per file, 5 files per message. Enforced in the upload-token endpoint and re-checked in the chat route.

## 11. Error Handling

| Where | Trigger | Response |
|---|---|---|
| `/api/chat` entry | No session | 401; client redirects to `/sign-in`. |
| `/api/chat` entry | User has no `user_key` | 412 with code `no_key`; client redirects to `/onboarding`. |
| `/api/chat` runtime | OpenCode returns 401 | `onError` in the stream → "Your API key is invalid. Update it in settings." |
| `/api/chat` runtime | OpenCode returns 402 | → "Add credits at opencode.ai/auth to continue." |
| `/api/chat` runtime | OpenCode returns 429 | → "Rate limited. Try again in a moment." Client uses exponential backoff on retry. |
| `/api/chat` runtime | OpenCode returns 4xx for chosen model | → "This model doesn't support that request. Try another." |
| `/api/chat` runtime | Network error / timeout | `onError` + "Connection issue. Retry?" button. |
| `/api/chat` runtime | AbortSignal from stop button | Clean abort, partial assistant message persisted with `metadata.aborted: true`. |
| Any API | Conversation not found or not owned | 404 → "Chat not found" with link to `/chat`. |
| Any API | Unhandled exception | Logged with request id, 500 returned; client shows "Something went wrong." without leaking details. |

All error messages are user-friendly strings. The raw upstream error is logged server-side with a request id; the response body contains only the safe message.

## 12. Testing

- **Unit (Vitest)**
  - `lib/crypto.ts` — roundtrip, wrong-key rejection, IV uniqueness across 1000 encrypts.
  - `lib/opencode/provider.ts` — table-driven test of model id → provider dispatch.
  - `lib/opencode/models.ts` — model tagging (free / zen / go) given fixtures.
  - `lib/opencode/stream.ts` — onFinish persistence (mock `streamText`).
- **Integration (Vitest + ephemeral Neon branch)**
  - Auth: sign up, sign in, OAuth callback (mocked), session lookup, sign out.
  - Conversation CRUD: create, list, rename, soft-delete, restore.
  - Message persistence: streaming -> DB write with metadata.
  - Search: `to_tsvector` over `message.parts` text and `ilike` over `conversation.title`; assert ranking.
- **E2E (Playwright)**
  - Sign up → onboarding → save key → send first message → see streamed response.
  - Multi-conversation: create chat 2, switch back to chat 1, verify messages persist.
  - Settings: update key, sign out, sign back in.
  - Theme toggle persists.
- **Manual on Vercel preview** before each release.
- A `fixtures/opencode-responses/` directory with a few captured Zen responses (one per provider family) so tests don't hit the real API.

## 13. Out of Scope (reiterated)

- No folders / tags / pinning
- No public sharing
- No voice
- No tool calling
- No branching
- No per-message model override
- No real-time multi-device
- No i18n
- No MCP / plugin support

## 14. Open Questions for the Implementation Plan

- Exact Vercel Blob free tier limits at the time of deploy — verify during planning.
- Whether `@ai-sdk/openai` works against OpenCode's `/zen/v1/responses` endpoint as-is, or whether we need to use `createOpenAICompatible` with a `/responses` baseURL. Spike in plan task 1.
- Whether `@ai-sdk/google` handles the per-model path for OpenCode's Gemini endpoint cleanly, or whether we need a small custom fetch adapter. Spike in plan task 1.
- Whether `streamText` `onFinish` reliably fires on abort, or whether we need a separate abort handler that writes the partial message. Spike in plan task 1.

These are non-blocking for the spec. The plan will resolve them with small, time-boxed spikes before committing to a structure.

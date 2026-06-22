# opencode-chat-app

Multi-user AI chat web app. Bring your own OpenCode API key; the app handles accounts, encrypted key storage, multi-device sync, and streaming chat against every OpenCode Zen and Go model.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Better Auth · Drizzle ORM · Neon Postgres · Vercel AI SDK v6 · Streamdown · Vercel Blob · deployed on Vercel.

## Local development

```bash
cp .env.example .env.local
# fill in DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY, OAuth client ids, BLOB_READ_WRITE_TOKEN
npm install
npm run dev
```

## Scripts

- `npm run dev` — local dev
- `npm run build` — production build
- `npm run typecheck` — TypeScript without emit
- `npm run lint` — Next.js lint
- `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` — Drizzle
- `npm test` / `npm run test:watch` — Vitest
- `npm run test:e2e` — Playwright

## Architecture

See `docs/superpowers/specs/2026-06-22-opencode-chat-app-design.md`.

## License

MIT

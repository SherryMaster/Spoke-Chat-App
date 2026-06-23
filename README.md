# Spoke

A web chat client for OpenCode. Bring your own API key. Every model, every device.

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
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — apply migrations
- `npm run db:push` — push schema to DB
- `npm run db:studio` — Drizzle Studio
- `npm test` — Vitest
- `npm run test:e2e` — Playwright

## Architecture

See `docs/superpowers/specs/2026-06-22-opencode-chat-app-design.md`.

## License

MIT

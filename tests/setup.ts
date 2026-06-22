process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64')
process.env.BETTER_AUTH_SECRET ??= 'a'.repeat(48)
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'
process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??= 'http://localhost:3000'

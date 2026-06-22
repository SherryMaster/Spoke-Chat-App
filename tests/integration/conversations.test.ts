import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversation, message, user } from '@/db/schema'

let userId: string

beforeAll(async () => {
  const [u] = await db.insert(user).values({
    id: `test-${Date.now()}`,
    name: 'Test',
    email: `test-${Date.now()}@example.com`,
    updatedAt: new Date(),
  }).returning()
  userId = u.id
})

afterAll(async () => {
  await db.delete(conversation).where(eq(conversation.userId, userId))
  await db.delete(user).where(eq(user.id, userId))
})

describe('conversation CRUD', () => {
  it('creates, lists, soft-deletes, and restores a conversation', async () => {
    const [c] = await db.insert(conversation).values({
      userId,
      modelId: 'claude-sonnet-4-6',
      title: 'Hello',
    }).returning()

    expect(c.title).toBe('Hello')
    expect(c.deletedAt).toBeNull()

    await db.insert(message).values({
      conversationId: c.id,
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    })

    const msgs = await db.select().from(message).where(eq(message.conversationId, c.id))
    expect(msgs).toHaveLength(1)

    await db.update(conversation).set({ deletedAt: new Date() }).where(eq(conversation.id, c.id))
    const after = await db.select().from(conversation).where(eq(conversation.id, c.id))
    expect(after[0].deletedAt).not.toBeNull()
  })
})

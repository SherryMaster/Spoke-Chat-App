import { describe, it, expect, beforeAll } from 'vitest'
import { encryptKey, decryptKey } from '@/lib/crypto'

beforeAll(() => {
  // 32 bytes base64 — stable for tests
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
})

describe('crypto', () => {
  it('round-trips a key', () => {
    const plaintext = 'sk-zen-abcdefghijklmnopqrstuvwxyz0123456789ABCD'
    const { ciphertext, iv, authTag } = encryptKey(plaintext)
    expect(decryptKey({ ciphertext, iv, authTag })).toBe(plaintext)
  })

  it('rejects on tampered ciphertext', () => {
    const { ciphertext, iv, authTag } = encryptKey('sk-zen-original')
    const tampered = Buffer.from(ciphertext)
    tampered[0] ^= 0xff
    expect(() => decryptKey({ ciphertext: tampered, iv, authTag })).toThrow()
  })

  it('uses a unique IV each call', () => {
    const a = encryptKey('sk-zen-1')
    const b = encryptKey('sk-zen-1')
    expect(Buffer.compare(a.iv, b.iv)).not.toBe(0)
    expect(Buffer.compare(a.ciphertext, b.ciphertext)).not.toBe(0)
  })
})

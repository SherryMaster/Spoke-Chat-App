import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY is not set')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must decode to 32 bytes')
  return key
}

export interface EncryptedKey {
  ciphertext: Buffer
  iv: Buffer
  authTag: Buffer
}

export function encryptKey(plaintext: string): EncryptedKey {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { ciphertext, iv, authTag }
}

export function decryptKey({ ciphertext, iv, authTag }: EncryptedKey): string {
  const key = getKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function keyFingerprint(plaintext: string): string {
  if (plaintext.length < 8) return '****'
  return `${plaintext.slice(0, 4)}…${plaintext.slice(-4)}`
}

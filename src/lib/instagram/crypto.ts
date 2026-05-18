import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LEN    = 16
const TAG_LEN   = 16

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw || raw.length < 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY deve ter pelo menos 32 caracteres')
  }
  return Buffer.from(raw.slice(0, 32), 'utf8')
}

/** Returns `iv:ciphertext:authTag` — all hex encoded. */
export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

/** Decrypts a value previously produced by `encryptToken`. */
export function decryptToken(ciphertext: string): string {
  const key = getKey()
  const [ivHex, encHex, tagHex] = ciphertext.split(':')
  if (!ivHex || !encHex || !tagHex) throw new Error('Formato de token criptografado inválido')

  const iv        = Buffer.from(ivHex,  'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const tag       = Buffer.from(tagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

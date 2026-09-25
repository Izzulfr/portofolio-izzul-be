import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'

export const hashPassword = (plain: string) => argon2.hash(plain, { type: argon2.argon2id })

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

let decoy: Promise<string> | undefined

/**
 * Spends the same time as a real verification. Called when the email is unknown,
 * so response timing does not reveal which accounts exist.
 */
export async function verifyAgainstDecoy(plain: string): Promise<void> {
  decoy ??= hashPassword(randomBytes(24).toString('hex'))
  await verifyPassword(await decoy, plain)
}

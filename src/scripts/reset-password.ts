/**
 * Sets an administrator's password from the command line, creating the account
 * if it does not exist yet. For when the password is lost and nobody can sign in.
 *
 *   npm run admin:password -- you@example.com "a new long password"
 */
import { eq } from 'drizzle-orm'
import { db, sql } from '../db/client.js'
import { users } from '../db/schema.js'
import { hashPassword } from '../lib/password.js'
import { revokeAllSessions } from '../lib/tokens.js'

const [emailArg, password] = process.argv.slice(2)
const email = emailArg?.trim().toLowerCase()

if (!email || !password) {
  console.error('Usage: npm run admin:password -- <email> "<new password>"')
  process.exit(1)
}

if (password.length < 10) {
  console.error('Use a password of at least 10 characters.')
  process.exit(1)
}

try {
  const passwordHash = await hashPassword(password)
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing) {
    await db.update(users).set({ passwordHash }).where(eq(users.id, existing.id))
    await revokeAllSessions(existing.id)
    console.log(`Password updated for ${email}. Existing sessions were signed out.`)
  } else {
    await db.insert(users).values({ email, name: email.split('@')[0] ?? 'Admin', passwordHash })
    console.log(`Created administrator ${email}.`)
  }
} finally {
  await sql.end()
}

import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, eq, lt, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { db } from '../db/client.js'
import { refreshTokens } from '../db/schema.js'

const ISSUER = 'portfolio-backend'
const AUDIENCE = 'portfolio-admin'

export interface SessionUser {
  id: string
  email: string
  name: string
}

export function signAccessToken(user: SessionUser): string {
  return jwt.sign({ email: user.email, name: user.name }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
  })
}

/** Throws a jsonwebtoken error (expired, bad signature, …) when the token is not usable. */
export function verifyAccessToken(token: string): SessionUser {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  })

  if (typeof payload === 'string' || !payload.sub) {
    throw new jwt.JsonWebTokenError('Malformed access token')
  }

  return { id: payload.sub, email: String(payload.email), name: String(payload.name) }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Starts a new token family when `familyId` is omitted (a fresh sign-in). */
export async function issueRefreshToken(userId: string, userAgent?: string, familyId?: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(refreshTokens).values({
    userId,
    familyId: familyId ?? randomUUID(),
    tokenHash: hashToken(token),
    userAgent: userAgent?.slice(0, 400) ?? null,
    expiresAt,
  })

  // Housekeeping: expired rows for this user are useless.
  await db
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), lt(refreshTokens.expiresAt, new Date())))

  return { token, expiresAt }
}

/**
 * Two tabs refreshing at the same moment both present the same cookie. The second
 * request lands just after the first one rotated it, which is not theft — so a
 * token *rotated* this recently is still exchanged. Signed-out tokens never are.
 */
const CONCURRENT_REFRESH_GRACE_MS = 30_000

export type Rotation =
  | { ok: true; userId: string; token: string; expiresAt: Date }
  | { ok: false }

export async function rotateRefreshToken(token: string, userAgent?: string): Promise<Rotation> {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(token)))
    .limit(1)

  if (!row || row.expiresAt.getTime() <= Date.now()) return { ok: false }

  if (row.revokedAt) {
    const recentlyRotated =
      row.rotatedAt !== null && Date.now() - row.rotatedAt.getTime() <= CONCURRENT_REFRESH_GRACE_MS

    if (!recentlyRotated) {
      // A rotated token replayed long afterwards was most likely copied: end every
      // session for the account. A signed-out token is simply refused.
      if (row.rotatedAt) await revokeAllSessions(row.userId)
      return { ok: false }
    }
  } else {
    const now = new Date()
    await db
      .update(refreshTokens)
      .set({ revokedAt: now, rotatedAt: now })
      .where(eq(refreshTokens.id, row.id))
  }

  const next = await issueRefreshToken(row.userId, userAgent, row.familyId)
  return { ok: true, userId: row.userId, ...next }
}

/**
 * Ends a token chain. Clearing `rotatedAt` also closes the concurrency grace
 * window, so none of the chain's recent ancestors can be exchanged afterwards.
 */
const terminate = { revokedAt: sql`coalesce(${refreshTokens.revokedAt}, now())`, rotatedAt: null }

/** Signs out the session that owns this token — every token in its family. */
export async function revokeRefreshToken(token: string) {
  const [row] = await db
    .select({ familyId: refreshTokens.familyId })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(token)))
    .limit(1)

  if (row) {
    await db.update(refreshTokens).set(terminate).where(eq(refreshTokens.familyId, row.familyId))
  }
}

/** Signs the account out everywhere. */
export async function revokeAllSessions(userId: string) {
  await db.update(refreshTokens).set(terminate).where(eq(refreshTokens.userId, userId))
}

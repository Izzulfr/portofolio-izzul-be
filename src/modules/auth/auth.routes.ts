import { eq } from 'drizzle-orm'
import { Router, type Response } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { db } from '../../db/client.js'
import { users } from '../../db/schema.js'
import { HttpError, unauthorized } from '../../lib/errors.js'
import { hashPassword, verifyAgainstDecoy, verifyPassword } from '../../lib/password.js'
import {
  issueRefreshToken,
  revokeAllSessions,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../../lib/tokens.js'
import { parse, requiredText } from '../../lib/validation.js'
import { requireAuth, requireTrustedOrigin } from '../../middleware/auth.js'
import { loginLimiter } from '../../middleware/rate-limit.js'

export const authRouter = Router()

const REFRESH_COOKIE = 'refresh_token'

/** Scoped to the auth routes, so the cookie never rides along on content requests. */
const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
} as const

type User = typeof users.$inferSelect

const publicUser = (user: User) => ({ id: user.id, email: user.email, name: user.name })

async function startSession(res: Response, user: User, userAgent?: string) {
  const refresh = await issueRefreshToken(user.id, userAgent)
  res.cookie(REFRESH_COOKIE, refresh.token, { ...cookieOptions, expires: refresh.expiresAt })

  return {
    accessToken: signAccessToken(user),
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    user: publicUser(user),
  }
}

async function findUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user
}

const invalidCredentials = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'That email and password do not match.')

// ------------------------------------------------------------------ login

const loginSchema = z.object({
  email: z.email('Enter a valid email address.').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Enter your password.').max(200),
})

authRouter.post('/login', requireTrustedOrigin, loginLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body)

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user) {
    await verifyAgainstDecoy(password)
    throw invalidCredentials()
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw invalidCredentials()
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  res.json({ data: await startSession(res, user, req.get('user-agent')) })
})

// ---------------------------------------------------------------- refresh

authRouter.post('/refresh', requireTrustedOrigin, async (req, res) => {
  const bodyToken = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken
  const token: unknown = req.cookies?.[REFRESH_COOKIE] ?? bodyToken

  if (typeof token !== 'string' || !token) {
    throw new HttpError(401, 'NO_SESSION', 'No active session.')
  }

  const rotation = await rotateRefreshToken(token, req.get('user-agent'))
  const user = rotation.ok ? await findUser(rotation.userId) : undefined

  if (!rotation.ok || !user) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions)
    throw new HttpError(401, 'SESSION_EXPIRED', 'Your session has ended. Please sign in again.')
  }

  res.cookie(REFRESH_COOKIE, rotation.token, { ...cookieOptions, expires: rotation.expiresAt })
  res.json({
    data: {
      accessToken: signAccessToken(user),
      expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
      user: publicUser(user),
    },
  })
})

// ----------------------------------------------------------------- logout

authRouter.post('/logout', requireTrustedOrigin, async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE]
  if (typeof token === 'string' && token) await revokeRefreshToken(token)

  res.clearCookie(REFRESH_COOKIE, cookieOptions)
  res.status(204).end()
})

// ---------------------------------------------------------------- account

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await findUser(req.user!.id)
  if (!user) throw unauthorized()
  res.json({ data: publicUser(user) })
})

const accountSchema = z.object({
  name: requiredText(120),
  email: z.email('Enter a valid email address.').transform((value) => value.toLowerCase()),
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const input = parse(accountSchema, req.body)
  const [user] = await db.update(users).set(input).where(eq(users.id, req.user!.id)).returning()
  if (!user) throw unauthorized()
  res.json({ data: publicUser(user) })
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters.')
      .max(200, 'Keep it under 200 characters.'),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one.',
  })

authRouter.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = parse(passwordSchema, req.body)
  const user = await findUser(req.user!.id)
  if (!user) throw unauthorized()

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Some fields need attention.', [
      { path: 'currentPassword', message: 'That is not your current password.' },
    ])
  }

  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, user.id))
    .returning()

  // Every other device is signed out; this one gets a fresh session.
  await revokeAllSessions(user.id)
  res.json({ data: await startSession(res, updated ?? user, req.get('user-agent')) })
})

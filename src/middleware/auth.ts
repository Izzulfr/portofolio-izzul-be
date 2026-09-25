import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { forbidden, HttpError, unauthorized } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/tokens.js'

/** Requires a valid `Authorization: Bearer <access token>` header. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''

  if (!token) {
    next(unauthorized())
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch (error) {
    next(
      error instanceof jwt.TokenExpiredError
        ? new HttpError(401, 'TOKEN_EXPIRED', 'Your session expired. Refreshing…')
        : unauthorized('Your session is not valid. Please sign in again.'),
    )
  }
}

/**
 * The session cookie endpoints change state based on a cookie alone, so a
 * request carrying an Origin from somewhere we do not serve is refused. Requests
 * without an Origin header (curl, server-to-server) are not browser CSRF.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin')
  if (!origin) {
    next()
    return
  }

  const self = `${req.protocol}://${req.get('host')}`
  if (origin === self || env.CORS_ORIGINS.includes(origin)) {
    next()
    return
  }

  next(forbidden('Requests from this origin are not allowed.'))
}

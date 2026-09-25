import type { SessionUser } from '../lib/tokens.js'

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth` once the bearer token has been verified. */
      user?: SessionUser
    }
  }
}

export {}

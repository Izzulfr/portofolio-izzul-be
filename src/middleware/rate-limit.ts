import { rateLimit, type Options } from 'express-rate-limit'

const respond: Options['handler'] = (_req, res, _next, options) => {
  res.status(options.statusCode).json({
    error: { code: 'RATE_LIMITED', message: String(options.message) },
  })
}

const base = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: respond,
} satisfies Partial<Options>

/** Failed sign-ins only: a correct password never counts against the limit. */
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
})

export const contactLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'You have sent several messages already. Please try again a little later.',
})

/** A generous ceiling for everything else, so a runaway client cannot hammer the API. */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
  message: 'Too many requests. Please slow down.',
})

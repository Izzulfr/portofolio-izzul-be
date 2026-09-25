import { Router } from 'express'
import { requireAuth } from './middleware/auth.js'
import { apiLimiter } from './middleware/rate-limit.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { contactRouter } from './modules/contact/contact.routes.js'
import { publicRouter } from './modules/public/public.routes.js'

export const apiRouter = Router()

apiRouter.use(apiLimiter)

// Content changes in the CMS should show up on the next visit. `no-cache` still
// lets browsers reuse a response after a cheap ETag revalidation (304).
apiRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-cache')
  next()
})

apiRouter.use('/auth', authRouter)
apiRouter.use('/contact', contactRouter)
apiRouter.use(
  '/admin',
  requireAuth,
  (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  },
  adminRouter,
)
apiRouter.use(publicRouter)

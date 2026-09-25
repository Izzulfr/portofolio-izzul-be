import cookieParser from 'cookie-parser'
import cors from 'cors'
import { sql } from 'drizzle-orm'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { db } from './db/client.js'
import { logger } from './lib/logger.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { apiRouter } from './routes.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', env.TRUST_PROXY)
  app.disable('x-powered-by')

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
    }),
  )

  // JSON only: images and documents are served by the frontend, never by this API.
  app.use(helmet())

  app.use(
    cors({
      origin(origin, done) {
        // No Origin header: same-origin, curl, or server-to-server.
        done(null, !origin || env.CORS_ORIGINS.includes(origin))
      },
      credentials: true,
      maxAge: 600,
    }),
  )

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  const health: express.RequestHandler = async (_req, res) => {
    try {
      await db.execute(sql`select 1`)
      res.json({ status: 'ok', database: 'up' })
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' })
    }
  }

  app.get('/health', health)
  app.get('/api/v1/health', health)
  app.use('/api/v1', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

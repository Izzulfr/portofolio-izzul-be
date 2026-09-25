import { createApp } from './app.js'
import { env } from './config/env.js'
import { sql } from './db/client.js'
import { logger } from './lib/logger.js'

const app = createApp()

const server = app.listen(env.PORT, (error?: Error) => {
  if (error) {
    logger.fatal({ err: error }, 'Could not start the server')
    process.exit(1)
  }
  logger.info(`API ready on http://localhost:${env.PORT}/api/v1`)
})

function shutdown(signal: string) {
  logger.info(`${signal} received, closing connections`)

  // Force the exit if open keep-alive connections hold the server open.
  setTimeout(() => process.exit(1), 10_000).unref()

  server.close(() => {
    sql
      .end({ timeout: 5 })
      .catch((error: unknown) => logger.error({ err: error }, 'Closing the database pool failed'))
      .finally(() => process.exit(0))
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

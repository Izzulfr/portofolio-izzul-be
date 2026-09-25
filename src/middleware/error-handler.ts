import type { ErrorRequestHandler, RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../lib/errors.js'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`))
}

interface PostgresLikeError {
  code?: string
  constraint_name?: string
  detail?: string
}

/** Drizzle wraps driver errors, so the Postgres code may sit one level down. */
function postgresError(error: unknown): PostgresLikeError | null {
  for (let current = error, depth = 0; current && depth < 3; depth++) {
    const candidate = current as PostgresLikeError & { cause?: unknown }
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate
    current = candidate.cause
  }
  return null
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error

  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE'
      ? new HttpError(413, 'FILE_TOO_LARGE', 'That file is larger than the upload limit.')
      : new HttpError(400, 'UPLOAD_ERROR', error.message)
  }

  const bodyError = error as { type?: string }
  if (bodyError.type === 'entity.parse.failed') {
    return new HttpError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
  }
  if (bodyError.type === 'entity.too.large') {
    return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.')
  }

  const pg = postgresError(error)
  if (pg?.code === '23505') {
    // e.g. projects_slug_unique → "slug"
    const field = pg.constraint_name?.match(/^[a-z]+_([a-z_]+)_unique$/)?.[1]
    return new HttpError(
      409,
      'DUPLICATE',
      field ? `That ${field.replace(/_/g, ' ')} is already in use.` : 'That record already exists.',
      field ? [{ path: field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), message: 'Already in use.' }] : undefined,
    )
  }
  if (pg?.code === '23503') {
    return new HttpError(409, 'IN_USE', 'This record is still referenced by other content.')
  }
  if (pg?.code === '22P02') {
    return new HttpError(400, 'INVALID_INPUT', 'One of the values has the wrong format.')
  }

  return new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.')
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  const httpError = toHttpError(error)

  if (httpError.status >= 500) {
    req.log.error({ err: error }, 'Request failed')
  }

  res.status(httpError.status).json({
    error: {
      code: httpError.code,
      message: httpError.message,
      ...(httpError.details ? { details: httpError.details } : {}),
    },
  })
}

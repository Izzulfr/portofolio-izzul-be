export interface FieldIssue {
  path: string
  message: string
}

/** An error that already knows how it should be reported to the client. */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: FieldIssue[]

  constructor(status: number, code: string, message: string, details?: FieldIssue[]) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: FieldIssue[]) =>
  new HttpError(400, 'BAD_REQUEST', message, details)

export const unauthorized = (message = 'You need to sign in to do that.') =>
  new HttpError(401, 'UNAUTHORIZED', message)

export const forbidden = (message = 'You are not allowed to do that.') =>
  new HttpError(403, 'FORBIDDEN', message)

export const notFound = (what = 'Resource') => new HttpError(404, 'NOT_FOUND', `${what} not found.`)

export const conflict = (message: string, details?: FieldIssue[]) =>
  new HttpError(409, 'CONFLICT', message, details)

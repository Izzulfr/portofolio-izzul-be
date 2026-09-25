import { z } from 'zod'
import { HttpError } from './errors.js'

/**
 * Parses untrusted input or throws a 400 listing every invalid field, so a form
 * can mark all of its problems at once instead of one per round trip.
 */
export function parse<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Some fields need attention.',
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    )
  }
  return result.data
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export const uuid = z.string().regex(UUID, 'Invalid id.')

// ------------------------------------------------------------ field helpers

export const requiredText = (max: number) =>
  z
    .string({ error: 'This field is required.' })
    .trim()
    .min(1, 'This field is required.')
    .max(max, `Keep this under ${max} characters.`)

/** Empty strings become `null`, so clearing a field in a form really clears it. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .nullish()
    .transform((value) => (value ? value : null))

/** A list of short strings. Blank entries are dropped rather than rejected. */
export const textList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().max(maxLength, `Keep each item under ${maxLength} characters.`))
    .max(maxItems, `Use at most ${maxItems} items.`)
    .transform((items) => items.filter(Boolean))

// Absolute http(s) URLs, mailto:/tel: links, or a path on this site such as
// /media/projects/cover.gif. Anything else — javascript: in particular — is refused.
const LINK = /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+|\/(?!\/)[^\s]*)$/i

export const optionalLink = z
  .string()
  .trim()
  .max(2048, 'That link is too long.')
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || LINK.test(value), {
    message: 'Use a full URL (https://…) or a site path (/media/…).',
  })

export const requiredLink = z
  .string({ error: 'This field is required.' })
  .trim()
  .min(1, 'This field is required.')
  .max(2048, 'That link is too long.')
  .refine((value) => LINK.test(value), {
    message: 'Use a full URL (https://…), a mailto: link, or a site path.',
  })

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(160, 'Keep the slug under 160 characters.')
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: 'Use lowercase letters, numbers and single dashes.',
  })

export const sortOrder = z.coerce.number().int().min(0).max(100_000)

export const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: 'Enter a valid date.',
  })

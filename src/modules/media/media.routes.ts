import path from 'node:path'
import { eq, ilike, or } from 'drizzle-orm'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { db } from '../../db/client.js'
import { posts, profile, projects, siteSettings } from '../../db/schema.js'
import { badRequest, conflict, HttpError } from '../../lib/errors.js'
import { slugify } from '../../lib/text.js'
import { parse } from '../../lib/validation.js'
import { ACCEPTED_UPLOADS, isMediaPath, MEDIA_FOLDERS, mediaUrl } from './files.js'
import { mediaStorage } from './storage.js'

/** Mounted at /api/v1/admin/media. */
export const mediaRouter = Router()

const upload = multer({
  // Kept in memory: the file is handed to the storage driver, never to this server's disk.
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 4 },
  // Browsers send filenames as raw UTF-8; the latin1 default garbles "résumé.pdf".
  defParamCharset: 'utf8',
  fileFilter(_req, file, done) {
    if (ACCEPTED_UPLOADS[file.mimetype]) done(null, true)
    else done(new HttpError(415, 'UNSUPPORTED_MEDIA', 'Upload a JPG, PNG, WebP, AVIF, GIF or PDF file.'))
  },
})

const meta = () => ({
  driver: mediaStorage.driver,
  writable: mediaStorage.writable,
  location: mediaStorage.location,
  folders: MEDIA_FOLDERS,
  maxUploadMb: env.MAX_UPLOAD_MB,
})

mediaRouter.get('/', async (_req, res) => {
  res.json({ data: await mediaStorage.list(), meta: meta() })
})

mediaRouter.post('/', upload.single('file'), async (req, res) => {
  if (!mediaStorage.writable) {
    throw new HttpError(409, 'MEDIA_READ_ONLY', 'This server cannot store files right now.')
  }

  const file = req.file
  if (!file) throw badRequest('Choose a file to upload.')

  const { folder } = parse(
    z.object({ folder: z.enum(MEDIA_FOLDERS, { error: 'Choose one of the media folders.' }) }),
    req.body,
  )

  const accepted = ACCEPTED_UPLOADS[file.mimetype]
  if (!accepted?.matches(file.buffer)) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA', 'The file contents do not match its type.')
  }

  const baseName = slugify(path.parse(file.originalname).name).slice(0, 60)
  const stored = await mediaStorage.put(folder, `${baseName}${accepted.extension}`, file.buffer)

  res.status(201).json({ data: stored, meta: meta() })
})

/** Where a file is still referenced, so deleting it would leave a broken image behind. */
async function findUsages(url: string): Promise<string[]> {
  const pattern = `%${url}%`
  const [projectRows, postRows, [owner], [settings]] = await Promise.all([
    db
      .select({ title: projects.title })
      .from(projects)
      .where(or(eq(projects.coverUrl, url), ilike(projects.content, pattern))),
    db
      .select({ title: posts.title })
      .from(posts)
      .where(or(eq(posts.coverUrl, url), ilike(posts.content, pattern))),
    db.select({ avatarUrl: profile.avatarUrl, resumeUrl: profile.resumeUrl }).from(profile).limit(1),
    db.select({ ogImageUrl: siteSettings.ogImageUrl }).from(siteSettings).limit(1),
  ])

  return [
    ...projectRows.map((row) => `Project “${row.title}”`),
    ...postRows.map((row) => `Post “${row.title}”`),
    ...(owner?.avatarUrl === url ? ['Profile photo'] : []),
    ...(owner?.resumeUrl === url ? ['CV link'] : []),
    ...(settings?.ogImageUrl === url ? ['Social share image'] : []),
  ]
}

const deleteQuery = z.object({
  path: z.string().refine(isMediaPath, { message: 'That is not a media file path.' }),
  force: z.enum(['true', 'false']).optional(),
})

mediaRouter.delete('/', async (req, res) => {
  if (!mediaStorage.writable) {
    throw new HttpError(409, 'MEDIA_READ_ONLY', 'This server cannot delete files right now.')
  }

  const { path: relativePath, force } = parse(deleteQuery, req.query)

  if (force !== 'true') {
    const usages = await findUsages(mediaUrl(relativePath))
    if (usages.length > 0) {
      throw conflict(
        `This file is still used by: ${usages.join(', ')}.`,
        usages.map((usage) => ({ path: 'usage', message: usage })),
      )
    }
  }

  await mediaStorage.remove(relativePath)
  res.status(204).end()
})

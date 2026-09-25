import { env } from '../../config/env.js'

/**
 * Media lives in the frontend repository (public/media), served by the site's own
 * CDN. These folders keep it organised; the CMS uploads into one of them.
 */
export const MEDIA_FOLDERS = ['projects', 'posts', 'profile', 'site', 'documents'] as const
export type MediaFolder = (typeof MEDIA_FOLDERS)[number]

export interface MediaFile {
  /** Relative to the media root, e.g. "projects/cover.gif". */
  path: string
  /** What content fields store and the site requests, e.g. "/media/projects/cover.gif". */
  url: string
  folder: string
  name: string
  size: number
  type: string
}

const TYPES_BY_EXTENSION: Record<string, string> = {
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  pdf: 'application/pdf',
}

const ascii = (head: Buffer, start: number, end: number) => head.subarray(start, end).toString('latin1')

/**
 * Uploadable types with the bytes their content must start with. The MIME type
 * a browser reports is trivially spoofed, so the file itself is checked. SVG is
 * deliberately absent: it can carry script.
 */
export const ACCEPTED_UPLOADS: Record<string, { extension: string; matches: (head: Buffer) => boolean }> = {
  'image/jpeg': { extension: '.jpg', matches: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff },
  'image/png': { extension: '.png', matches: (h) => h[0] === 0x89 && ascii(h, 1, 4) === 'PNG' },
  'image/gif': { extension: '.gif', matches: (h) => ascii(h, 0, 4) === 'GIF8' },
  'image/webp': { extension: '.webp', matches: (h) => ascii(h, 0, 4) === 'RIFF' && ascii(h, 8, 12) === 'WEBP' },
  'image/avif': {
    extension: '.avif',
    matches: (h) => ascii(h, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(h, 8, 12)),
  },
  'application/pdf': { extension: '.pdf', matches: (h) => ascii(h, 0, 5) === '%PDF-' },
}

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase()

/**
 * True for a relative path the CMS may list or delete: no traversal, no hidden
 * files, and a known media extension. Files added by hand keep their names, so
 * this is more lenient than the names the CMS itself generates.
 */
export function isMediaPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 300 || value.includes('\\') || value.includes('\0')) return false
  const segments = value.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.startsWith('.'))) {
    return false
  }
  return extensionOf(value) in TYPES_BY_EXTENSION
}

export function mediaUrl(relativePath: string) {
  return `${env.MEDIA_PUBLIC_PATH}/${relativePath.split('/').map(encodeURIComponent).join('/')}`
}

export function toMediaFile(relativePath: string, size: number): MediaFile {
  const segments = relativePath.split('/')
  return {
    path: relativePath,
    url: mediaUrl(relativePath),
    folder: segments.length > 1 ? (segments[0] ?? '') : '',
    name: segments.at(-1) ?? relativePath,
    size,
    type: TYPES_BY_EXTENSION[extensionOf(relativePath)] ?? 'application/octet-stream',
  }
}

export const sortFiles = (files: MediaFile[]) => files.sort((a, b) => a.path.localeCompare(b.path))

/** "cover.gif", then "cover-2.gif", "cover-3.gif"… until `taken` says a name is free. */
export async function uniqueName(fileName: string, taken: (candidate: string) => boolean | Promise<boolean>) {
  const dot = fileName.lastIndexOf('.')
  const stem = fileName.slice(0, dot)
  const extension = fileName.slice(dot)

  for (let attempt = 1; attempt < 100; attempt++) {
    const candidate = attempt === 1 ? fileName : `${stem}-${attempt}${extension}`
    if (!(await taken(candidate))) return candidate
  }
  return `${stem}-${Date.now().toString(36)}${extension}`
}

import { access, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { env } from '../../config/env.js'
import { HttpError, notFound } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { isMediaPath, sortFiles, toMediaFile, uniqueName, type MediaFile, type MediaFolder } from './files.js'

/**
 * Where uploaded media is written. The API never serves these files: the
 * frontend does, from its public/media folder.
 */
export interface MediaStorage {
  driver: 'filesystem' | 'github' | 'readonly'
  writable: boolean
  /** Shown in the CMS so the editor knows where files end up. */
  location: string
  list(): Promise<MediaFile[]>
  put(folder: MediaFolder, fileName: string, contents: Buffer): Promise<MediaFile>
  remove(relativePath: string): Promise<void>
}

const readOnlyError = () =>
  new HttpError(
    409,
    'MEDIA_READ_ONLY',
    'This server cannot store files. Add them to the frontend’s public/media folder and redeploy, or configure GitHub storage.',
  )

// ------------------------------------------------------------ filesystem

/** Writes straight into the frontend checkout next to this one — for local development. */
function filesystemStorage(root: string): MediaStorage {
  const resolve = (relativePath: string) => {
    const absolute = path.resolve(root, relativePath)
    if (!absolute.startsWith(root + path.sep)) throw notFound('File')
    return absolute
  }

  return {
    driver: 'filesystem',
    writable: true,
    location: root,

    async list() {
      const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => [])
      const files: MediaFile[] = []
      for (const entry of entries) {
        if (!entry.isFile()) continue
        const relative = path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
        if (!isMediaPath(relative)) continue
        const { size } = await stat(path.join(entry.parentPath, entry.name))
        files.push(toMediaFile(relative, size))
      }
      return sortFiles(files)
    },

    async put(folder, fileName, contents) {
      const directory = path.join(root, folder)
      await mkdir(directory, { recursive: true })
      const name = await uniqueName(fileName, (candidate) =>
        access(path.join(directory, candidate)).then(
          () => true,
          () => false,
        ),
      )
      // `wx` refuses to overwrite, in case two uploads race for the same name.
      await writeFile(path.join(directory, name), contents, { flag: 'wx' })
      return toMediaFile(`${folder}/${name}`, contents.length)
    },

    async remove(relativePath) {
      await rm(resolve(relativePath)).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') throw notFound('File')
        throw error
      })
    },
  }
}

// ---------------------------------------------------------------- github

interface GithubOptions {
  token: string
  repo: string
  branch: string
  mediaPath: string
  apiUrl: string
}

/**
 * Commits uploads to the frontend repository through the GitHub REST API. The
 * host (Vercel) redeploys on every commit, so a new file is live about a minute
 * later — and nothing depends on this server's disk surviving a restart.
 */
function githubStorage(options: GithubOptions): MediaStorage {
  const [owner = '', repository = ''] = options.repo.split('/')
  const base = `${options.apiUrl.replace(/\/+$/, '')}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`
  const encodePath = (value: string) => value.split('/').map(encodeURIComponent).join('/')
  const ref = `ref=${encodeURIComponent(options.branch)}`

  async function call<T>(method: 'GET' | 'PUT' | 'DELETE', apiPath: string, body?: unknown): Promise<T | null> {
    let response: Response
    try {
      response = await fetch(`${base}${apiPath}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${options.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'portfolio-cms',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (error) {
      logger.error({ err: error }, 'GitHub request failed')
      throw new HttpError(502, 'STORAGE_UNREACHABLE', 'Could not reach GitHub to store the file.')
    }

    if (method === 'GET' && response.status === 404) return null
    if (response.ok) return response.status === 204 ? null : ((await response.json()) as T)

    const detail = await response.text().catch(() => '')
    logger.warn({ status: response.status, detail: detail.slice(0, 300) }, 'GitHub rejected a media request')

    if (response.status === 401 || response.status === 403) {
      throw new HttpError(502, 'STORAGE_AUTH', 'GitHub refused the request. Check GITHUB_TOKEN and its repository permissions.')
    }
    if (response.status === 404) {
      throw new HttpError(502, 'STORAGE_NOT_FOUND', `GitHub could not find ${options.repo} on branch ${options.branch}.`)
    }
    if (response.status === 409 || response.status === 422) {
      throw new HttpError(409, 'STORAGE_CONFLICT', 'GitHub rejected the change because the file changed meanwhile. Try again.')
    }
    throw new HttpError(502, 'STORAGE_ERROR', `GitHub answered with an error (${response.status}).`)
  }

  let cache: { files: MediaFile[]; at: number } | null = null

  async function fetchFiles(): Promise<MediaFile[]> {
    const segments = options.mediaPath.split('/')
    const folderName = segments.pop()
    const parent = segments.join('/')

    const siblings = await call<{ name: string; type: string; sha: string }[]>('GET', `/contents/${encodePath(parent)}?${ref}`)
    if (siblings === null) {
      throw new HttpError(502, 'STORAGE_NOT_FOUND', `GitHub could not find "${parent || '/'}" in ${options.repo}@${options.branch}.`)
    }

    const directory = Array.isArray(siblings)
      ? siblings.find((item) => item.name === folderName && item.type === 'dir')
      : undefined
    if (!directory) return []

    const tree = await call<{ tree: { path: string; type: string; size?: number }[] }>(
      'GET',
      `/git/trees/${directory.sha}?recursive=1`,
    )

    return sortFiles(
      (tree?.tree ?? [])
        .filter((entry) => entry.type === 'blob' && isMediaPath(entry.path))
        .map((entry) => toMediaFile(entry.path, entry.size ?? 0)),
    )
  }

  return {
    driver: 'github',
    writable: true,
    location: `${options.repo}@${options.branch}:${options.mediaPath}`,

    async list() {
      // A short cache keeps the media picker quick without going stale for long.
      if (cache && Date.now() - cache.at < 15_000) return cache.files
      const files = await fetchFiles()
      cache = { files, at: Date.now() }
      return files
    },

    async put(folder, fileName, contents) {
      const existing = new Set((await fetchFiles()).map((file) => file.path))
      const name = await uniqueName(fileName, (candidate) => existing.has(`${folder}/${candidate}`))
      const relative = `${folder}/${name}`
      const repositoryPath = `${options.mediaPath}/${relative}`

      await call('PUT', `/contents/${encodePath(repositoryPath)}`, {
        message: `cms: add ${repositoryPath}`,
        content: contents.toString('base64'),
        branch: options.branch,
      })

      cache = null
      return toMediaFile(relative, contents.length)
    },

    async remove(relativePath) {
      const repositoryPath = `${options.mediaPath}/${relativePath}`
      const current = await call<{ sha: string }>('GET', `/contents/${encodePath(repositoryPath)}?${ref}`)
      if (!current?.sha) throw notFound('File')

      await call('DELETE', `/contents/${encodePath(repositoryPath)}`, {
        message: `cms: delete ${repositoryPath}`,
        sha: current.sha,
        branch: options.branch,
      })
      cache = null
    },
  }
}

// -------------------------------------------------------------- read-only

function readOnlyStorage(reason: string): MediaStorage {
  return {
    driver: 'readonly',
    writable: false,
    location: reason,
    list: async () => [],
    put: async () => {
      throw readOnlyError()
    },
    remove: async () => {
      throw readOnlyError()
    },
  }
}

// ----------------------------------------------------------------- choose

function createStorage(): MediaStorage {
  const mediaDir = path.resolve(env.MEDIA_DIR)
  const githubReady = Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO)

  const driver =
    env.MEDIA_DRIVER !== 'auto'
      ? env.MEDIA_DRIVER
      : githubReady
        ? 'github'
        : !env.isProduction && existsSync(mediaDir)
          ? 'filesystem'
          : 'readonly'

  if (driver === 'github' && env.GITHUB_TOKEN && env.GITHUB_REPO) {
    return githubStorage({
      token: env.GITHUB_TOKEN,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
      mediaPath: env.GITHUB_MEDIA_PATH,
      apiUrl: env.GITHUB_API_URL,
    })
  }

  if (driver === 'filesystem') return filesystemStorage(mediaDir)

  return readOnlyStorage(
    env.MEDIA_DRIVER === 'readonly'
      ? 'uploads are turned off with MEDIA_DRIVER=readonly'
      : env.isProduction
        ? 'GitHub storage is not configured'
        : `folder not found: ${mediaDir}`,
  )
}

export const mediaStorage = createStorage()

logger.info(`Media storage: ${mediaStorage.driver} (${mediaStorage.location})`)

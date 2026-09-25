import { z } from 'zod'

const flag = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((value) => value === 'true' || value === '1')

const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    /** `true`, a hop count, or an Express trust-proxy preset such as `loopback`. */
    TRUST_PROXY: z
      .string()
      .default('false')
      .transform((value): boolean | number | string => {
        if (value === 'true') return true
        if (value === 'false' || value === '') return false
        const hops = Number(value)
        return Number.isInteger(hops) ? hops : value
      }),

    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim().replace(/\/$/, ''))
          .filter(Boolean),
      ),
    SITE_URL: optional,

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60 * 24).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: flag.optional(),

    ADMIN_NAME: optional,
    ADMIN_EMAIL: optional,
    ADMIN_PASSWORD: optional,

    /**
     * Where CMS uploads go. Files always live in the frontend's public/media folder:
     * `filesystem` writes to a local checkout of it, `github` commits to the repository,
     * `readonly` refuses uploads. `auto` picks github when a token is set, filesystem
     * when MEDIA_DIR exists outside production, and readonly otherwise.
     */
    MEDIA_DRIVER: z.enum(['auto', 'filesystem', 'github', 'readonly']).default('auto'),
    MEDIA_DIR: z.string().default('../portfolio-frontend/public/media'),
    /** URL prefix the site serves media from. */
    MEDIA_PUBLIC_PATH: z
      .string()
      .default('/media')
      .transform((value) => `/${value.replace(/^\/+|\/+$/g, '')}`),
    MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(10),

    GITHUB_TOKEN: optional,
    GITHUB_REPO: optional.refine((value) => value === undefined || /^[\w.-]+\/[\w.-]+$/.test(value), {
      message: 'Use the owner/repository form, e.g. izzul/portfolio-frontend',
    }),
    GITHUB_BRANCH: z.string().trim().default('main'),
    GITHUB_MEDIA_PATH: z
      .string()
      .default('public/media')
      .transform((value) => value.replace(/^\/+|\/+$/g, '')),
    GITHUB_API_URL: z.string().default('https://api.github.com'),

    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: flag.default(false),
    SMTP_USER: optional,
    SMTP_PASS: optional,
    MAIL_FROM: optional,
    CONTACT_NOTIFY_EMAIL: optional,
  })
  .transform((raw) => ({
    ...raw,
    isProduction: raw.NODE_ENV === 'production',
    // Secure cookies by default in production; a local http:// dev server needs them off.
    COOKIE_SECURE: raw.COOKIE_SECURE ?? raw.NODE_ENV === 'production',
  }))
  .superRefine((value, ctx) => {
    if (value.MEDIA_DRIVER === 'github' && !(value.GITHUB_TOKEN && value.GITHUB_REPO)) {
      ctx.addIssue({
        code: 'custom',
        path: ['MEDIA_DRIVER'],
        message: 'MEDIA_DRIVER=github needs GITHUB_TOKEN and GITHUB_REPO',
      })
    }
    if (value.COOKIE_SAMESITE === 'none' && !value.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SAMESITE=none only works with COOKIE_SECURE=true',
      })
    }
  })

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  // Fail fast with every problem listed, rather than crashing later on the first one used.
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env

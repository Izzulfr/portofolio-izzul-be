import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// Everything the portfolio renders lives in these tables. The API is the only
// writer; the frontend never talks to the database directly.

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/** Ordered, publishable collections share these two columns. */
const listing = {
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
}

const emptyTextArray = sql`'{}'::text[]`

// ------------------------------------------------------------------- auth

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
})

/**
 * One row per issued refresh token. Only a SHA-256 hash is stored, so a leaked
 * database does not hand out working sessions. Tokens rotate on every use; every
 * token descended from one sign-in shares a `familyId`, so signing out ends the
 * whole chain at once.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    userAgent: varchar('user_agent', { length: 400 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    /** Set when the token was exchanged for a newer one (as opposed to signed out). */
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refresh_tokens_user_idx').on(table.userId),
    index('refresh_tokens_family_idx').on(table.familyId),
  ],
)

// -------------------------------------------------------------- singletons

/** Exactly one person owns this portfolio, so the row is pinned to id = 1. */
export const profile = pgTable(
  'profile',
  {
    id: integer('id').primaryKey().default(1),
    name: varchar('name', { length: 120 }).notNull(),
    headline: varchar('headline', { length: 120 }).notNull(),
    /** Job titles cycled through next to the headline. */
    roles: text('roles').array().notNull().default(emptyTextArray),
    summary: text('summary').notNull(),
    /** Markdown, rendered on the About page. */
    bio: text('bio').notNull().default(''),
    location: varchar('location', { length: 120 }),
    email: varchar('email', { length: 254 }),
    avatarUrl: text('avatar_url'),
    resumeUrl: text('resume_url'),
    availability: varchar('availability', { length: 120 }),
    isAvailable: boolean('is_available').notNull().default(true),
    updatedAt: timestamps.updatedAt,
  },
  (table) => [check('profile_singleton', sql`${table.id} = 1`)],
)

export interface ProcessStep {
  title: string
  description: string
}

/** Site-wide copy and SEO metadata (id = 1). */
export const siteSettings = pgTable(
  'site_settings',
  {
    id: integer('id').primaryKey().default(1),
    siteTitle: varchar('site_title', { length: 120 }).notNull(),
    siteDescription: varchar('site_description', { length: 300 }).notNull(),
    ogImageUrl: text('og_image_url'),
    /** Wrap a word in *asterisks* to give it the accent treatment. */
    heroTitle: varchar('hero_title', { length: 200 }).notNull(),
    heroSubtitle: text('hero_subtitle').notNull(),
    processSteps: jsonb('process_steps')
      .$type<ProcessStep[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    contactTitle: varchar('contact_title', { length: 200 }).notNull(),
    contactText: text('contact_text').notNull(),
    footerNote: varchar('footer_note', { length: 200 }),
    updatedAt: timestamps.updatedAt,
  },
  (table) => [check('site_settings_singleton', sql`${table.id} = 1`)],
)

// ------------------------------------------------------------- collections

export const stats = pgTable(
  'stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    value: varchar('value', { length: 20 }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    ...listing,
    ...timestamps,
  },
  (table) => [index('stats_order_idx').on(table.sortOrder)],
)

export const socialLinks = pgTable(
  'social_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    label: varchar('label', { length: 60 }).notNull(),
    url: text('url').notNull(),
    /** One of the icon keys the frontend knows: linkedin, github, email, … */
    icon: varchar('icon', { length: 30 }).notNull().default('link'),
    ...listing,
    ...timestamps,
  },
  (table) => [index('social_links_order_idx').on(table.sortOrder)],
)

export const experiences = pgTable(
  'experiences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company: varchar('company', { length: 160 }).notNull(),
    companyUrl: text('company_url'),
    role: varchar('role', { length: 160 }).notNull(),
    employmentType: varchar('employment_type', { length: 60 }),
    location: varchar('location', { length: 120 }),
    /** Free text such as "Dec 2024 — Present", so partial dates stay honest. */
    period: varchar('period', { length: 60 }).notNull(),
    isCurrent: boolean('is_current').notNull().default(false),
    summary: text('summary'),
    highlights: text('highlights').array().notNull().default(emptyTextArray),
    tags: text('tags').array().notNull().default(emptyTextArray),
    ...listing,
    ...timestamps,
  },
  (table) => [index('experiences_order_idx').on(table.sortOrder)],
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    title: varchar('title', { length: 160 }).notNull(),
    summary: varchar('summary', { length: 400 }).notNull(),
    /** Markdown case study. */
    content: text('content').notNull().default(''),
    role: varchar('role', { length: 120 }),
    client: varchar('client', { length: 160 }),
    category: varchar('category', { length: 60 }),
    year: varchar('year', { length: 20 }),
    /** A site path such as /media/projects/cover.gif (files live in the frontend), or a URL. */
    coverUrl: text('cover_url'),
    coverAlt: varchar('cover_alt', { length: 300 }),
    stack: text('stack').array().notNull().default(emptyTextArray),
    deliverables: text('deliverables').array().notNull().default(emptyTextArray),
    liveUrl: text('live_url'),
    repoUrl: text('repo_url'),
    isFeatured: boolean('is_featured').notNull().default(false),
    ...listing,
    ...timestamps,
  },
  (table) => [
    index('projects_order_idx').on(table.sortOrder),
    index('projects_featured_idx').on(table.isFeatured),
  ],
)

export const skillGroups = pgTable(
  'skill_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 120 }).notNull(),
    description: varchar('description', { length: 300 }),
    items: text('items').array().notNull().default(emptyTextArray),
    ...listing,
    ...timestamps,
  },
  (table) => [index('skill_groups_order_idx').on(table.sortOrder)],
)

export const education = pgTable(
  'education',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    institution: varchar('institution', { length: 160 }).notNull(),
    degree: varchar('degree', { length: 200 }).notNull(),
    field: varchar('field', { length: 200 }),
    period: varchar('period', { length: 60 }).notNull(),
    description: text('description'),
    ...listing,
    ...timestamps,
  },
  (table) => [index('education_order_idx').on(table.sortOrder)],
)

export const certifications = pgTable(
  'certifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    issuer: varchar('issuer', { length: 160 }),
    year: varchar('year', { length: 20 }),
    credentialUrl: text('credential_url'),
    ...listing,
    ...timestamps,
  },
  (table) => [index('certifications_order_idx').on(table.sortOrder)],
)

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    role: varchar('role', { length: 160 }).notNull(),
    period: varchar('period', { length: 60 }).notNull(),
    description: text('description'),
    ...listing,
    ...timestamps,
  },
  (table) => [index('organizations_order_idx').on(table.sortOrder)],
)

/** Blog posts are ordered by publish date, so they have no manual sort order. */
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    title: varchar('title', { length: 200 }).notNull(),
    excerpt: varchar('excerpt', { length: 400 }).notNull(),
    /** Markdown. */
    content: text('content').notNull().default(''),
    coverUrl: text('cover_url'),
    tags: text('tags').array().notNull().default(emptyTextArray),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('posts_published_idx').on(table.isPublished, table.publishedAt)],
)

// ------------------------------------------------------------------ inbox

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    subject: varchar('subject', { length: 160 }),
    body: text('body').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_created_idx').on(table.createdAt),
    index('messages_unread_idx').on(table.isRead),
  ],
)

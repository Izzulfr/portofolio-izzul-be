/**
 * Loads the starting content. Safe to run repeatedly:
 *
 * - the admin account is created once and its password is never overwritten;
 * - singletons and collections are only filled while they are empty, and
 *   projects and posts are matched by slug — so edits made in the CMS survive;
 * - `--fresh` wipes the content tables first (never users or messages).
 *
 *   npm run db:seed
 *   npm run db:seed -- --fresh
 */
import { count } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { env } from '../../config/env.js'
import { hashPassword } from '../../lib/password.js'
import { readingMinutes } from '../../lib/text.js'
import { db, sql } from '../client.js'
import {
  certifications,
  education,
  experiences,
  organizations,
  posts,
  profile,
  projects,
  siteSettings,
  skillGroups,
  socialLinks,
  stats,
  users,
} from '../schema.js'
import {
  certificationRows,
  educationRows,
  experienceRows,
  organizationRows,
  profileRow,
  projectRows,
  settingsRow,
  skillGroupRows,
  socialRows,
  statRows,
} from './content.js'
import { postRows } from './posts.js'

const fresh = process.argv.includes('--fresh')

/** Prints where the seed writes without leaking credentials into scrollback. */
function describeTarget(): string {
  try {
    const url = new URL(env.DATABASE_URL)
    return `${url.hostname}:${url.port || 5432}${url.pathname}`
  } catch {
    return 'an unparseable DATABASE_URL'
  }
}

async function isEmpty(table: PgTable) {
  const [row] = await db.select({ value: count() }).from(table)
  return (row?.value ?? 0) === 0
}

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.warn('  admin: skipped — set ADMIN_EMAIL and ADMIN_PASSWORD to create one')
    return
  }
  if (env.ADMIN_PASSWORD.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters.')
  }

  const inserted = await db
    .insert(users)
    .values({
      email: env.ADMIN_EMAIL.toLowerCase(),
      name: env.ADMIN_NAME ?? 'Admin',
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    })
    .onConflictDoNothing({ target: users.email })
    .returning({ email: users.email })

  console.log(
    inserted.length
      ? `  admin: created ${inserted[0]?.email}`
      : `  admin: ${env.ADMIN_EMAIL} already exists, password left unchanged`,
  )
}

async function seedCollection<T extends PgTable>(label: string, table: T, rows: T['$inferInsert'][]) {
  if (!(await isEmpty(table))) {
    console.log(`  ${label}: already has content, skipped`)
    return
  }
  await db.insert(table).values(rows.map((row, sortOrder) => ({ ...row, sortOrder })) as never)
  console.log(`  ${label}: ${rows.length}`)
}

async function main() {
  console.log(`Seeding ${describeTarget()}${fresh ? ' (fresh)' : ''}`)

  if (fresh) {
    await db.transaction(async (tx) => {
      for (const table of [
        stats,
        socialLinks,
        experiences,
        projects,
        skillGroups,
        education,
        certifications,
        organizations,
        posts,
      ]) {
        await tx.delete(table)
      }
      await tx.delete(profile)
      await tx.delete(siteSettings)
    })
    console.log('  cleared content tables')
  }

  await seedAdmin()

  await db.insert(profile).values(profileRow).onConflictDoNothing({ target: profile.id })
  await db.insert(siteSettings).values(settingsRow).onConflictDoNothing({ target: siteSettings.id })
  console.log('  profile & site settings: ok')

  await seedCollection('stats', stats, statRows)
  await seedCollection('social links', socialLinks, socialRows)
  await seedCollection('experiences', experiences, experienceRows)
  await seedCollection('skill groups', skillGroups, skillGroupRows)
  await seedCollection('education', education, educationRows)
  await seedCollection('certifications', certifications, certificationRows)
  await seedCollection('organizations', organizations, organizationRows)

  const newProjects = await db
    .insert(projects)
    .values(projectRows.map((row, sortOrder) => ({ ...row, sortOrder })))
    .onConflictDoNothing({ target: projects.slug })
    .returning({ slug: projects.slug })
  console.log(`  projects: ${newProjects.length} added, ${projectRows.length - newProjects.length} kept`)

  const newPosts = await db
    .insert(posts)
    .values(postRows.map((row) => ({ ...row, readingMinutes: readingMinutes(row.content ?? '') })))
    .onConflictDoNothing({ target: posts.slug })
    .returning({ slug: posts.slug })
  console.log(`  posts: ${newPosts.length} added, ${postRows.length - newPosts.length} kept`)

  console.log('Done.')
}

try {
  await main()
} catch (error) {
  console.error('Seed failed:', error)
  process.exitCode = 1
} finally {
  await sql.end()
}

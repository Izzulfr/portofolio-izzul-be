import { and, arrayContains, asc, count, desc, eq, gt, lt, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
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
} from '../../db/schema.js'
import { HttpError, notFound } from '../../lib/errors.js'
import { parse } from '../../lib/validation.js'

/**
 * Read-only content for the public site. Only published rows are returned, and
 * only the fields a visitor should see — never sort orders or draft flags.
 */
export const publicRouter = Router()

// --------------------------------------------------------------------- site

publicRouter.get('/site', async (_req, res) => {
  const [[owner], [settings], socials, statRows] = await Promise.all([
    db.select().from(profile).limit(1),
    db.select().from(siteSettings).limit(1),
    db
      .select({ id: socialLinks.id, label: socialLinks.label, url: socialLinks.url, icon: socialLinks.icon })
      .from(socialLinks)
      .where(eq(socialLinks.isPublished, true))
      .orderBy(asc(socialLinks.sortOrder)),
    db
      .select({ id: stats.id, value: stats.value, label: stats.label })
      .from(stats)
      .where(eq(stats.isPublished, true))
      .orderBy(asc(stats.sortOrder)),
  ])

  if (!owner || !settings) {
    throw new HttpError(503, 'NOT_SEEDED', 'This site has no content yet. Run `npm run db:seed`.')
  }

  const { id: _profileId, updatedAt: _profileUpdated, ...publicProfile } = owner
  const { id: _settingsId, updatedAt: _settingsUpdated, ...publicSettings } = settings

  res.json({ data: { profile: publicProfile, settings: publicSettings, socials, stats: statRows } })
})

// ----------------------------------------------------------------- projects

const projectCard = {
  id: projects.id,
  slug: projects.slug,
  title: projects.title,
  summary: projects.summary,
  role: projects.role,
  client: projects.client,
  category: projects.category,
  year: projects.year,
  coverUrl: projects.coverUrl,
  coverAlt: projects.coverAlt,
  stack: projects.stack,
  deliverables: projects.deliverables,
  isFeatured: projects.isFeatured,
}

const projectOrder = [asc(projects.sortOrder), desc(projects.createdAt)]

const projectQuery = z.object({
  featured: z.enum(['true', 'false']).optional(),
  category: z.string().trim().max(60).optional(),
})

publicRouter.get('/projects', async (req, res) => {
  const query = parse(projectQuery, req.query)

  const rows = await db
    .select(projectCard)
    .from(projects)
    .where(
      and(
        eq(projects.isPublished, true),
        query.featured ? eq(projects.isFeatured, query.featured === 'true') : undefined,
        query.category ? eq(projects.category, query.category) : undefined,
      ),
    )
    .orderBy(...projectOrder)

  res.json({ data: rows })
})

publicRouter.get('/projects/:slug', async (req, res) => {
  const [project] = await db
    .select({
      ...projectCard,
      content: projects.content,
      liveUrl: projects.liveUrl,
      repoUrl: projects.repoUrl,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(and(eq(projects.slug, req.params.slug), eq(projects.isPublished, true)))
    .limit(1)

  if (!project) throw notFound('Project')

  // The "next project" link wraps around, so the last case study still leads somewhere.
  const siblings = await db
    .select({ slug: projects.slug, title: projects.title })
    .from(projects)
    .where(eq(projects.isPublished, true))
    .orderBy(...projectOrder)

  const index = siblings.findIndex((sibling) => sibling.slug === project.slug)
  const hasSiblings = siblings.length > 1

  res.json({
    data: {
      project,
      previous: hasSiblings ? siblings.at(index - 1) ?? null : null,
      next: hasSiblings ? siblings[(index + 1) % siblings.length] ?? null : null,
    },
  })
})

// -------------------------------------------------------------- about page

publicRouter.get('/experiences', async (_req, res) => {
  const rows = await db
    .select({
      id: experiences.id,
      company: experiences.company,
      companyUrl: experiences.companyUrl,
      role: experiences.role,
      employmentType: experiences.employmentType,
      location: experiences.location,
      period: experiences.period,
      isCurrent: experiences.isCurrent,
      summary: experiences.summary,
      highlights: experiences.highlights,
      tags: experiences.tags,
    })
    .from(experiences)
    .where(eq(experiences.isPublished, true))
    .orderBy(asc(experiences.sortOrder), desc(experiences.createdAt))

  res.json({ data: rows })
})

publicRouter.get('/skills', async (_req, res) => {
  const rows = await db
    .select({
      id: skillGroups.id,
      title: skillGroups.title,
      description: skillGroups.description,
      items: skillGroups.items,
    })
    .from(skillGroups)
    .where(eq(skillGroups.isPublished, true))
    .orderBy(asc(skillGroups.sortOrder))

  res.json({ data: rows })
})

publicRouter.get('/education', async (_req, res) => {
  const rows = await db
    .select({
      id: education.id,
      institution: education.institution,
      degree: education.degree,
      field: education.field,
      period: education.period,
      description: education.description,
    })
    .from(education)
    .where(eq(education.isPublished, true))
    .orderBy(asc(education.sortOrder))

  res.json({ data: rows })
})

publicRouter.get('/certifications', async (_req, res) => {
  const rows = await db
    .select({
      id: certifications.id,
      name: certifications.name,
      issuer: certifications.issuer,
      year: certifications.year,
      credentialUrl: certifications.credentialUrl,
    })
    .from(certifications)
    .where(eq(certifications.isPublished, true))
    .orderBy(asc(certifications.sortOrder))

  res.json({ data: rows })
})

publicRouter.get('/organizations', async (_req, res) => {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: organizations.role,
      period: organizations.period,
      description: organizations.description,
    })
    .from(organizations)
    .where(eq(organizations.isPublished, true))
    .orderBy(asc(organizations.sortOrder))

  res.json({ data: rows })
})

// -------------------------------------------------------------------- blog

const postCard = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  coverUrl: posts.coverUrl,
  tags: posts.tags,
  readingMinutes: posts.readingMinutes,
  publishedAt: posts.publishedAt,
}

const postQuery = z.object({
  tag: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

publicRouter.get('/posts', async (req, res) => {
  const { tag, page, pageSize } = parse(postQuery, req.query)

  const visible = and(
    eq(posts.isPublished, true),
    tag ? arrayContains(posts.tags, [tag]) : undefined,
  )

  const [rows, [totals], tagRows] = await Promise.all([
    db
      .select(postCard)
      .from(posts)
      .where(visible)
      .orderBy(desc(posts.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(posts).where(visible),
    db.execute<{ tag: string }>(
      sql`select distinct unnest(${posts.tags}) as tag from ${posts} where ${posts.isPublished} = true order by tag`,
    ),
  ])

  const total = totals?.total ?? 0

  res.json({
    data: rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      tags: Array.from(tagRows, (row) => row.tag),
    },
  })
})

publicRouter.get('/posts/:slug', async (req, res) => {
  const [post] = await db
    .select({ ...postCard, content: posts.content, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.slug, req.params.slug), eq(posts.isPublished, true)))
    .limit(1)

  if (!post) throw notFound('Post')

  const neighbour = { slug: posts.slug, title: posts.title }
  const [[older], [newer]] = post.publishedAt
    ? await Promise.all([
        db
          .select(neighbour)
          .from(posts)
          .where(and(eq(posts.isPublished, true), lt(posts.publishedAt, post.publishedAt)))
          .orderBy(desc(posts.publishedAt))
          .limit(1),
        db
          .select(neighbour)
          .from(posts)
          .where(and(eq(posts.isPublished, true), gt(posts.publishedAt, post.publishedAt)))
          .orderBy(asc(posts.publishedAt))
          .limit(1),
      ])
    : [[], []]

  res.json({ data: { post, previous: older ?? null, next: newer ?? null } })
})

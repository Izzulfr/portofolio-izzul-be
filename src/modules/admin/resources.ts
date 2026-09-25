import { asc, desc } from 'drizzle-orm'
import { z } from 'zod'
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
import { readingMinutes, slugify } from '../../lib/text.js'
import {
  optionalDate,
  optionalLink,
  optionalText,
  requiredLink,
  requiredText,
  slug,
  sortOrder,
  textList,
} from '../../lib/validation.js'
import type { CollectionConfig, Row, SingletonConfig } from './crud.js'

const publishable = {
  sortOrder: sortOrder.optional(),
  isPublished: z.boolean(),
}

/** Fills in a slug from the title when the editor leaves it blank. */
function withSlug(data: Row, existing: Row | null): Row {
  if (!existing || 'slug' in data) {
    const title = String(data.title ?? existing?.title ?? '')
    data.slug = data.slug || slugify(title)
  }
  return data
}

export const SOCIAL_ICONS = [
  'linkedin',
  'github',
  'email',
  'x',
  'instagram',
  'whatsapp',
  'youtube',
  'medium',
  'dribbble',
  'behance',
  'website',
  'link',
] as const

export const collections: Record<string, CollectionConfig> = {
  projects: {
    label: 'Project',
    table: projects,
    id: projects.id,
    sortOrder: projects.sortOrder,
    newestFirst: true,
    fields: z.object({
      title: requiredText(160),
      slug,
      summary: requiredText(400),
      content: z.string().max(100_000),
      role: optionalText(120),
      client: optionalText(160),
      category: optionalText(60),
      year: optionalText(20),
      coverUrl: optionalLink,
      coverAlt: optionalText(300),
      stack: textList(30, 60),
      deliverables: textList(30, 80),
      liveUrl: optionalLink,
      repoUrl: optionalLink,
      isFeatured: z.boolean(),
      ...publishable,
    }),
    defaults: { content: '', stack: [], deliverables: [], isFeatured: false, isPublished: true },
    orderBy: [asc(projects.sortOrder), desc(projects.createdAt)],
    prepare: withSlug,
  },

  experiences: {
    label: 'Experience',
    table: experiences,
    id: experiences.id,
    sortOrder: experiences.sortOrder,
    newestFirst: true,
    fields: z.object({
      company: requiredText(160),
      companyUrl: optionalLink,
      role: requiredText(160),
      employmentType: optionalText(60),
      location: optionalText(120),
      period: requiredText(60),
      isCurrent: z.boolean(),
      summary: optionalText(2000),
      highlights: textList(20, 400),
      tags: textList(20, 60),
      ...publishable,
    }),
    defaults: { isCurrent: false, highlights: [], tags: [], isPublished: true },
    orderBy: [asc(experiences.sortOrder), desc(experiences.createdAt)],
  },

  'skill-groups': {
    label: 'Skill group',
    table: skillGroups,
    id: skillGroups.id,
    sortOrder: skillGroups.sortOrder,
    fields: z.object({
      title: requiredText(120),
      description: optionalText(300),
      items: textList(60, 80),
      ...publishable,
    }),
    defaults: { items: [], isPublished: true },
    orderBy: [asc(skillGroups.sortOrder), asc(skillGroups.createdAt)],
  },

  education: {
    label: 'Education',
    table: education,
    id: education.id,
    sortOrder: education.sortOrder,
    newestFirst: true,
    fields: z.object({
      institution: requiredText(160),
      degree: requiredText(200),
      field: optionalText(200),
      period: requiredText(60),
      description: optionalText(1000),
      ...publishable,
    }),
    defaults: { isPublished: true },
    orderBy: [asc(education.sortOrder), desc(education.createdAt)],
  },

  certifications: {
    label: 'Certification',
    table: certifications,
    id: certifications.id,
    sortOrder: certifications.sortOrder,
    newestFirst: true,
    fields: z.object({
      name: requiredText(200),
      issuer: optionalText(160),
      year: optionalText(20),
      credentialUrl: optionalLink,
      ...publishable,
    }),
    defaults: { isPublished: true },
    orderBy: [asc(certifications.sortOrder), desc(certifications.createdAt)],
  },

  organizations: {
    label: 'Organization',
    table: organizations,
    id: organizations.id,
    sortOrder: organizations.sortOrder,
    newestFirst: true,
    fields: z.object({
      name: requiredText(160),
      role: requiredText(160),
      period: requiredText(60),
      description: optionalText(1000),
      ...publishable,
    }),
    defaults: { isPublished: true },
    orderBy: [asc(organizations.sortOrder), desc(organizations.createdAt)],
  },

  posts: {
    label: 'Post',
    table: posts,
    id: posts.id,
    fields: z.object({
      title: requiredText(200),
      slug,
      excerpt: requiredText(400),
      content: z.string().max(200_000),
      coverUrl: optionalLink,
      tags: textList(12, 40),
      isPublished: z.boolean(),
      publishedAt: optionalDate,
    }),
    defaults: { content: '', tags: [], isPublished: false },
    // Drafts (no publish date) sort first, then newest published.
    orderBy: [desc(posts.publishedAt), desc(posts.createdAt)],
    prepare(data, existing) {
      withSlug(data, existing)

      if (typeof data.content === 'string') {
        data.readingMinutes = readingMinutes(data.content)
      }

      const published = (data.isPublished ?? existing?.isPublished) === true
      const publishedAt = 'publishedAt' in data ? data.publishedAt : existing?.publishedAt
      if (published && !publishedAt) data.publishedAt = new Date()

      return data
    },
  },

  stats: {
    label: 'Stat',
    table: stats,
    id: stats.id,
    sortOrder: stats.sortOrder,
    fields: z.object({
      value: requiredText(20),
      label: requiredText(120),
      ...publishable,
    }),
    defaults: { isPublished: true },
    orderBy: [asc(stats.sortOrder), asc(stats.createdAt)],
  },

  'social-links': {
    label: 'Social link',
    table: socialLinks,
    id: socialLinks.id,
    sortOrder: socialLinks.sortOrder,
    fields: z.object({
      label: requiredText(60),
      url: requiredLink,
      icon: z.enum(SOCIAL_ICONS, { error: 'Pick one of the listed icons.' }),
      ...publishable,
    }),
    defaults: { icon: 'link', isPublished: true },
    orderBy: [asc(socialLinks.sortOrder), asc(socialLinks.createdAt)],
  },
}

const optionalEmail = z
  .union([z.literal(''), z.email('Enter a valid email address.').max(254)])
  .nullish()
  .transform((value) => (value ? value.toLowerCase() : null))

export const profileSingleton: SingletonConfig = {
  label: 'Profile',
  table: profile,
  id: profile.id,
  fields: z.object({
    name: requiredText(120),
    headline: requiredText(120),
    roles: textList(8, 80),
    summary: requiredText(600),
    bio: z.string().max(20_000),
    location: optionalText(120),
    email: optionalEmail,
    avatarUrl: optionalLink,
    resumeUrl: optionalLink,
    availability: optionalText(120),
    isAvailable: z.boolean(),
  }),
}

export const settingsSingleton: SingletonConfig = {
  label: 'Site settings',
  table: siteSettings,
  id: siteSettings.id,
  fields: z.object({
    siteTitle: requiredText(120),
    siteDescription: requiredText(300),
    ogImageUrl: optionalLink,
    heroTitle: requiredText(200),
    heroSubtitle: requiredText(600),
    processSteps: z
      .array(z.object({ title: requiredText(40), description: requiredText(200) }))
      .max(8, 'Use at most 8 steps.'),
    contactTitle: requiredText(200),
    contactText: requiredText(600),
    footerNote: optionalText(200),
  }),
}

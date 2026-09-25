import { count, desc, eq, type SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { Router } from 'express'
import { db } from '../../db/client.js'
import { experiences, messages, posts, projects } from '../../db/schema.js'
import { collectionRouter, singletonRouter } from './crud.js'
import { mediaRouter } from '../media/media.routes.js'
import { messagesRouter } from './messages.routes.js'
import { collections, profileSingleton, settingsSingleton } from './resources.js'

/** Everything under /api/v1/admin. Mounted behind `requireAuth`. */
export const adminRouter = Router()

async function countOf(table: PgTable, where?: SQL) {
  const [row] = await db.select({ value: count() }).from(table).where(where)
  return row?.value ?? 0
}

adminRouter.get('/overview', async (_req, res) => {
  const [
    projectsTotal,
    projectDrafts,
    postsTotal,
    postDrafts,
    experiencesTotal,
    messagesTotal,
    unreadMessages,
    recentMessages,
  ] = await Promise.all([
    countOf(projects),
    countOf(projects, eq(projects.isPublished, false)),
    countOf(posts),
    countOf(posts, eq(posts.isPublished, false)),
    countOf(experiences),
    countOf(messages),
    countOf(messages, eq(messages.isRead, false)),
    db.select().from(messages).orderBy(desc(messages.createdAt)).limit(5),
  ])

  res.json({
    data: {
      counts: {
        projects: projectsTotal,
        projectDrafts,
        posts: postsTotal,
        postDrafts,
        experiences: experiencesTotal,
        messages: messagesTotal,
        unreadMessages,
      },
      recentMessages,
    },
  })
})

adminRouter.use('/profile', singletonRouter(profileSingleton))
adminRouter.use('/settings', singletonRouter(settingsSingleton))
adminRouter.use('/messages', messagesRouter)
adminRouter.use('/media', mediaRouter)

for (const [path, config] of Object.entries(collections)) {
  adminRouter.use(`/${path}`, collectionRouter(config))
}

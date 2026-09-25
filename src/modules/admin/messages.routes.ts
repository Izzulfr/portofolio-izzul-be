import { count, desc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { messages } from '../../db/schema.js'
import { notFound } from '../../lib/errors.js'
import { isUuid, parse } from '../../lib/validation.js'

export const messagesRouter = Router()

async function unreadCount() {
  const [row] = await db.select({ value: count() }).from(messages).where(eq(messages.isRead, false))
  return row?.value ?? 0
}

messagesRouter.get('/', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['all', 'unread']).default('all') }), req.query)

  const [rows, unread] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(status === 'unread' ? eq(messages.isRead, false) : undefined)
      .orderBy(desc(messages.createdAt))
      .limit(500),
    unreadCount(),
  ])

  res.json({ data: rows, meta: { unread } })
})

messagesRouter.post('/read-all', async (_req, res) => {
  await db.update(messages).set({ isRead: true }).where(eq(messages.isRead, false))
  res.status(204).end()
})

messagesRouter.patch('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) throw notFound('Message')
  const { isRead } = parse(z.object({ isRead: z.boolean() }), req.body)

  const [row] = await db
    .update(messages)
    .set({ isRead })
    .where(eq(messages.id, req.params.id))
    .returning()

  if (!row) throw notFound('Message')
  res.json({ data: row })
})

messagesRouter.delete('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) throw notFound('Message')
  const [row] = await db
    .delete(messages)
    .where(eq(messages.id, req.params.id))
    .returning({ id: messages.id })

  if (!row) throw notFound('Message')
  res.status(204).end()
})

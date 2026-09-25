import { eq, sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { notFound } from '../../lib/errors.js'
import { isUuid, parse, uuid } from '../../lib/validation.js'

export type Row = Record<string, unknown>

export interface CollectionConfig {
  /** Singular, for messages: "Project not found." */
  label: string
  table: PgTable
  id: AnyPgColumn
  /** Present on collections the editor can reorder by hand. */
  sortOrder?: AnyPgColumn
  /** New rows go to the top of the list instead of the bottom. */
  newestFirst?: boolean
  /**
   * The writable fields, without defaults. Creating merges `defaults` in first;
   * updating parses a partial copy, so fields that were not sent stay untouched.
   */
  fields: z.ZodObject
  defaults: Row
  orderBy: SQL[]
  /** Derives server-owned values (slugs, reading time, publish date) before a write. */
  prepare?: (data: Row, existing: Row | null) => Row
}

/** Generates list / read / create / update / delete / reorder routes for one table. */
export function collectionRouter(config: CollectionConfig): Router {
  const router = Router()
  const { table } = config
  const partialFields = config.fields.partial()

  async function find(id: string): Promise<Row> {
    if (!isUuid(id)) throw notFound(config.label)
    const [row] = await db.select().from(table).where(eq(config.id, id)).limit(1)
    if (!row) throw notFound(config.label)
    return row
  }

  router.get('/', async (_req, res) => {
    const rows = await db.select().from(table).orderBy(...config.orderBy)
    res.json({ data: rows })
  })

  router.post('/reorder', async (req, res) => {
    const sortOrder = config.sortOrder
    if (!sortOrder) throw notFound('Route')

    const { ids } = parse(z.object({ ids: z.array(uuid).min(1).max(500) }), req.body)

    await db.transaction(async (tx) => {
      for (const [position, id] of ids.entries()) {
        await tx
          .update(table)
          .set({ sortOrder: position } as never)
          .where(eq(config.id, id))
      }
    })

    res.status(204).end()
  })

  router.get('/:id', async (req, res) => {
    res.json({ data: await find(req.params.id) })
  })

  router.post('/', async (req, res) => {
    const input = parse(config.fields, { ...config.defaults, ...(req.body as Row | undefined) }) as Row
    const data = config.prepare ? config.prepare(input, null) : input

    const row = await db.transaction(async (tx) => {
      const sortOrder = config.sortOrder
      if (sortOrder && data.sortOrder === undefined) {
        if (config.newestFirst) {
          await tx.update(table).set({ sortOrder: sql`${sortOrder} + 1` } as never)
          data.sortOrder = 0
        } else {
          const [last] = await tx
            .select({ value: sql<number>`coalesce(max(${sortOrder}), -1)` })
            .from(table)
          data.sortOrder = Number(last?.value ?? -1) + 1
        }
      }

      const [inserted] = await tx.insert(table).values(data as never).returning()
      return inserted
    })

    res.status(201).json({ data: row })
  })

  router.patch('/:id', async (req, res) => {
    const existing = await find(req.params.id)
    const input = parse(partialFields, req.body ?? {}) as Row

    for (const key of Object.keys(input)) {
      if (input[key] === undefined) delete input[key]
    }

    const data = config.prepare ? config.prepare(input, existing) : input
    if (Object.keys(data).length === 0) {
      res.json({ data: existing })
      return
    }

    const [row] = await db
      .update(table)
      .set(data as never)
      .where(eq(config.id, existing.id as string))
      .returning()

    res.json({ data: row })
  })

  router.delete('/:id', async (req, res) => {
    const existing = await find(req.params.id)
    await db.delete(table).where(eq(config.id, existing.id as string))
    res.status(204).end()
  })

  return router
}

export interface SingletonConfig {
  label: string
  table: PgTable
  id: AnyPgColumn
  fields: z.ZodObject
}

/** GET and PUT for a single-row table pinned to id = 1. */
export function singletonRouter(config: SingletonConfig): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const [row] = await db.select().from(config.table).where(eq(config.id, 1)).limit(1)
    if (!row) throw notFound(config.label)
    res.json({ data: row })
  })

  router.put('/', async (req, res) => {
    const data = parse(config.fields, req.body) as Row

    const [row] = await db
      .insert(config.table)
      .values({ ...data, id: 1 } as never)
      .onConflictDoUpdate({ target: config.id, set: data as never })
      .returning()

    res.json({ data: row })
  })

  return router
}

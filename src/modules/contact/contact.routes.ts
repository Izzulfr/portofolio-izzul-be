import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { messages } from '../../db/schema.js'
import { notifyNewMessage } from '../../lib/mailer.js'
import { optionalText, parse, requiredText } from '../../lib/validation.js'
import { contactLimiter } from '../../middleware/rate-limit.js'

export const contactRouter = Router()

const contactSchema = z.object({
  name: requiredText(120),
  email: z.email('Enter a valid email address.').max(254),
  subject: optionalText(160),
  message: z
    .string({ error: 'Write a message.' })
    .trim()
    .min(10, 'Tell me a little more — at least 10 characters.')
    .max(5000, 'Keep the message under 5,000 characters.'),
  /** Honeypot: hidden from people, irresistible to form-filling bots. */
  extraInfo: z.string().optional(),
})

contactRouter.post('/', contactLimiter, async (req, res) => {
  const input = parse(contactSchema, req.body)

  // Answer bots exactly like a success, so they have nothing to learn from.
  if (input.extraInfo) {
    res.status(201).json({ data: { received: true } })
    return
  }

  const [message] = await db
    .insert(messages)
    .values({ name: input.name, email: input.email, subject: input.subject, body: input.message })
    .returning()

  if (message) {
    // The visitor should not wait on (or fail because of) the mail server.
    notifyNewMessage(message).catch((error: unknown) => {
      req.log.warn({ err: error }, 'Contact notification email failed')
    })
  }

  res.status(201).json({ data: { received: true } })
})

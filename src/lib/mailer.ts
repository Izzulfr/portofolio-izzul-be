import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

interface IncomingMessage {
  name: string
  email: string
  subject: string | null
  body: string
  createdAt: Date
}

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

export const notificationsEnabled = Boolean(transport && env.CONTACT_NOTIFY_EMAIL)

if (!notificationsEnabled) {
  logger.info('Contact notifications are off: messages are only stored in the CMS inbox.')
}

/** Emails the site owner about a new contact form message. Optional by design. */
export async function notifyNewMessage(message: IncomingMessage): Promise<void> {
  if (!transport || !env.CONTACT_NOTIFY_EMAIL) return

  const inbox = env.SITE_URL ? `${env.SITE_URL.replace(/\/$/, '')}/admin/messages` : null

  await transport.sendMail({
    from: env.MAIL_FROM ?? env.SMTP_USER,
    to: env.CONTACT_NOTIFY_EMAIL,
    replyTo: { name: message.name, address: message.email },
    subject: `New message from ${message.name}${message.subject ? ` — ${message.subject}` : ''}`,
    text: [
      `${message.name} <${message.email}> wrote:`,
      '',
      message.body,
      '',
      '—',
      `Received ${message.createdAt.toUTCString()}`,
      inbox ? `Open the inbox: ${inbox}` : '',
      'Reply to this email to answer directly.',
    ].join('\n'),
  })
}

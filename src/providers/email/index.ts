import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { newId } from '@/lib/ids';

/**
 * Email delivery behind a vendor-neutral interface. The console provider is the
 * dev/test default (it also appends to a JSONL "outbox" the e2e tests read to
 * fetch magic-link URLs). The SMTP provider works with ANY SMTP host, so an
 * operator is never locked into a specific email vendor.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string; provider: string }>;
}

export function createConsoleEmailProvider(opts: {
  from: string;
  outboxPath: string;
}): EmailProvider {
  return {
    name: 'console',
    async send(message) {
      const id = newId();
      const record = { id, at: Date.now(), from: opts.from, ...message };
      try {
        mkdirSync(dirname(opts.outboxPath), { recursive: true });
        appendFileSync(opts.outboxPath, `${JSON.stringify(record)}\n`);
      } catch {
        // Dev outbox is best-effort; never fail a send because a file couldn't
        // be written.
      }
      console.info(`[email:console] to=${message.to} subject=${JSON.stringify(message.subject)}`);
      console.info(message.text);
      return { id, provider: 'console' };
    },
  };
}

export function createSmtpEmailProvider(opts: {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}): EmailProvider {
  return {
    name: 'smtp',
    async send(message) {
      // Imported lazily so the console/dev path never loads nodemailer.
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: opts.host,
        port: opts.port,
        secure: opts.secure,
        auth: opts.user ? { user: opts.user, pass: opts.password } : undefined,
      });
      const info = await transport.sendMail({
        from: opts.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: message.headers,
      });
      return { id: info.messageId, provider: 'smtp' };
    },
  };
}

import { z } from 'zod';

/**
 * Typed, validated configuration derived from environment variables.
 *
 * Config is the ONLY place environment variables are read. Everything else
 * receives a typed `Config` object, which keeps secrets out of scattered
 * `process.env` reads and makes the full set of tunables discoverable in one
 * file (mirrored by `.env.example`).
 */

const boolFromString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .or(z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1).default('file:./local.db'),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  OPR_KEK_ACTIVE_ID: z.string().min(1).default('k1'),
  OPR_INDEX_KEY: z.string().optional(),

  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  EMAIL_FROM: z.string().default('Open Pet Registry <no-reply@example.org>'),
  EMAIL_DEV_OUTBOX: z.string().default('./var/dev-outbox.jsonl'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: boolFromString.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3', 'vercel-blob']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./var/uploads'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  RATE_LIMITER: z.enum(['memory', 'db']).default('memory'),

  // Comma-separated list of owner emails granted access to the /admin screen.
  ADMIN_EMAILS: z.string().default(''),
});

export interface Config {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly isProduction: boolean;
  readonly appUrl: string;
  readonly database: { url: string; authToken: string | undefined };
  readonly crypto: {
    activeKekId: string;
    /** Map of KEK id -> base64(32-byte key). Includes retired keys for rewrap. */
    keks: Record<string, string>;
    indexKey: string | undefined;
  };
  readonly email: {
    provider: 'console' | 'smtp';
    from: string;
    devOutbox: string;
    smtp: {
      host: string | undefined;
      port: number;
      secure: boolean;
      user: string | undefined;
      password: string | undefined;
    };
  };
  readonly storage: {
    provider: 'local' | 's3' | 'vercel-blob';
    localDir: string;
    blobToken: string | undefined;
    s3: {
      endpoint: string | undefined;
      region: string;
      bucket: string | undefined;
      accessKeyId: string | undefined;
      secretAccessKey: string | undefined;
      publicBaseUrl: string | undefined;
    };
  };
  readonly rateLimiter: 'memory' | 'db';
  readonly adminEmails: string[];
}

/** Collect every `OPR_KEK_<id>` entry (excluding the ACTIVE_ID pointer). */
function collectKeks(env: NodeJS.ProcessEnv): Record<string, string> {
  const keks: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    const match = /^OPR_KEK_(.+)$/.exec(key);
    const id = match?.[1];
    if (id && id !== 'ACTIVE_ID' && value) {
      keks[id] = value;
    }
  }
  return keks;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);
  const config: Config = {
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',
    appUrl: parsed.APP_URL.replace(/\/+$/, ''),
    database: { url: parsed.DATABASE_URL, authToken: parsed.DATABASE_AUTH_TOKEN },
    crypto: {
      activeKekId: parsed.OPR_KEK_ACTIVE_ID,
      keks: collectKeks(env),
      indexKey: parsed.OPR_INDEX_KEY,
    },
    email: {
      provider: parsed.EMAIL_PROVIDER,
      from: parsed.EMAIL_FROM,
      devOutbox: parsed.EMAIL_DEV_OUTBOX,
      smtp: {
        host: parsed.SMTP_HOST,
        port: parsed.SMTP_PORT,
        secure: parsed.SMTP_SECURE,
        user: parsed.SMTP_USER,
        password: parsed.SMTP_PASSWORD,
      },
    },
    storage: {
      provider: parsed.STORAGE_PROVIDER,
      localDir: parsed.STORAGE_LOCAL_DIR,
      blobToken: parsed.BLOB_READ_WRITE_TOKEN,
      s3: {
        endpoint: parsed.S3_ENDPOINT,
        region: parsed.S3_REGION,
        bucket: parsed.S3_BUCKET,
        accessKeyId: parsed.S3_ACCESS_KEY_ID,
        secretAccessKey: parsed.S3_SECRET_ACCESS_KEY,
        publicBaseUrl: parsed.S3_PUBLIC_BASE_URL,
      },
    },
    rateLimiter: parsed.RATE_LIMITER,
    adminEmails: parsed.ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e !== ''),
  };

  assertProductionSafety(config);
  return config;
}

/**
 * Fail fast on a misconfigured production deploy. A registry that boots without
 * its encryption keys would silently write recoverable plaintext — refuse.
 */
function assertProductionSafety(config: Config): void {
  if (!config.isProduction) return;
  const problems: string[] = [];
  if (!config.crypto.keks[config.crypto.activeKekId]) {
    problems.push(`active KEK "${config.crypto.activeKekId}" (OPR_KEK_${config.crypto.activeKekId}) is not set`);
  }
  if (!config.crypto.indexKey) problems.push('OPR_INDEX_KEY is not set');
  if (config.email.provider === 'smtp' && !config.email.smtp.host) {
    problems.push('EMAIL_PROVIDER=smtp but SMTP_HOST is not set');
  }
  if (config.storage.provider === 's3' && !config.storage.s3.bucket) {
    problems.push('STORAGE_PROVIDER=s3 but S3_BUCKET is not set');
  }
  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n  - ${problems.join('\n  - ')}`);
  }
}

let cached: Config | undefined;

/** Memoized config for the running process. */
export function getConfig(): Config {
  cached ??= loadConfig();
  return cached;
}

/** Test helper: clear the memoized config so a new environment is re-read. */
export function resetConfigCache(): void {
  cached = undefined;
}

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

/**
 * Object storage for pet photos, behind an interface so a self-hoster can use
 * the local filesystem (default) while a larger deployment uses any
 * S3-compatible bucket (MinIO, Cloudflare R2, AWS S3) — no lock-in.
 *
 * NOTE: EXIF/GPS stripping happens in the photo service before bytes reach the
 * store (see services/photos), keeping this layer a plain byte store.
 */
export interface Storage {
  readonly name: string;
  put(key: string, data: Buffer, opts: { contentType: string }): Promise<{ key: string; url?: string }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}

/** Reject keys that could escape the storage root. */
function safeResolve(baseDir: string, key: string): string {
  const base = resolve(baseDir);
  const full = resolve(join(base, key));
  if (full !== base && !full.startsWith(base + sep)) {
    throw new Error('invalid storage key');
  }
  return full;
}

export function createLocalFsStorage(opts: { baseDir: string }): Storage {
  return {
    name: 'local',
    async put(key, data) {
      const full = safeResolve(opts.baseDir, key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, data);
      // Served by the app's /media/[...key] route.
      return { key, url: `/media/${key.split('/').map(encodeURIComponent).join('/')}` };
    },
    async get(key) {
      return readFile(safeResolve(opts.baseDir, key));
    },
    async delete(key) {
      await rm(safeResolve(opts.baseDir, key), { force: true });
    },
    async getUrl(key) {
      return `/media/${key.split('/').map(encodeURIComponent).join('/')}`;
    },
  };
}

/**
 * Vercel Blob storage — durable object storage for serverless deployments
 * (Vercel's ephemeral filesystem cannot persist uploads). The public blob URL
 * returned by `put` IS the stored key, so `getUrl` returns it verbatim and no
 * /media route is needed in production.
 */
export function createVercelBlobStorage(opts: { token?: string }): Storage {
  return {
    name: 'vercel-blob',
    async put(key, data, o) {
      const { put } = await import('@vercel/blob');
      const res = await put(key, data, {
        access: 'public',
        contentType: o.contentType,
        addRandomSuffix: true,
        ...(opts.token ? { token: opts.token } : {}),
      });
      return { key: res.url, url: res.url };
    },
    async get(key) {
      const res = await fetch(key);
      if (!res.ok) throw new Error(`blob fetch failed: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    async delete(key) {
      const { del } = await import('@vercel/blob');
      await del(key, opts.token ? { token: opts.token } : undefined);
    },
    async getUrl(key) {
      return key; // the stored key is already the public blob URL
    },
  };
}

/**
 * Placeholder for an S3-compatible adapter. The interface is stable; wiring a
 * real client (e.g. @aws-sdk/client-s3 against any S3 endpoint) is a follow-up
 * that requires no changes above this layer.
 */
export function createS3Storage(): Storage {
  const notBuilt = (): never => {
    throw new Error(
      'S3 storage adapter is not built in this MVP. Use STORAGE_PROVIDER=local, or implement createS3Storage against your S3-compatible endpoint.',
    );
  };
  return {
    name: 's3',
    put: notBuilt,
    get: notBuilt,
    delete: notBuilt,
    getUrl: notBuilt,
  };
}

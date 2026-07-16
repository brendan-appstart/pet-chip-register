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

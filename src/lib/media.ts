/**
 * Build the URL that serves a stored object. For the local filesystem provider
 * this maps to the app's /media route. (An S3 deployment would serve signed or
 * public bucket URLs instead; that path is a follow-up.)
 */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  // A provider (e.g. Vercel Blob) may store an absolute URL as the key — use it
  // directly. Otherwise it's a local storage key served by the /media route.
  if (/^https?:\/\//.test(key)) return key;
  return `/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}

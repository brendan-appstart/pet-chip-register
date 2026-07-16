import { readMedia } from '@/services/media';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await params;
  const joined = key.map(decodeURIComponent).join('/');
  const data = await readMedia(joined);
  if (!data) return new Response('Not found', { status: 404 });

  const ext = joined.split('.').pop()?.toLowerCase() ?? '';
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  return new Response(new Uint8Array(data), {
    headers: { 'content-type': contentType, 'cache-control': 'private, max-age=3600' },
  });
}

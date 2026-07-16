import { renderPetPoster } from '@/services/poster';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const poster = await renderPetPoster(token);
  if (!poster) return new Response('Not found', { status: 404 });
  return new Response(poster.body, {
    headers: { 'content-type': poster.contentType, 'cache-control': 'no-store' },
  });
}

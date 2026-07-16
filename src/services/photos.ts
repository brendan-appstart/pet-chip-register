import sharp from 'sharp';
import { getStorage } from '@/providers';
import { newId } from '@/lib/ids';

/**
 * Re-encode an uploaded pet photo to (a) strip EXIF/GPS metadata — sharp drops
 * metadata unless explicitly asked to keep it, closing a location-leak vector —
 * and (b) bound its dimensions and size. Returns the storage key.
 */
export async function processAndStorePetPhoto(petId: string, input: Buffer): Promise<string> {
  const processed = await sharp(input)
    .rotate() // bake in EXIF orientation, then discard metadata
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const key = `pets/${petId}/${newId()}.jpg`;
  // The provider may return a different canonical key (e.g. a Vercel Blob URL);
  // persist whatever it returns so getUrl() resolves correctly later.
  const stored = await getStorage().put(key, processed, { contentType: 'image/jpeg' });
  return stored.key;
}

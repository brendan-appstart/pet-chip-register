import { getConfig } from '@/config/env';
import { getPosterGenerator } from '@/providers';
import { qrDataUrl } from '@/lib/qr';
import { getPublicPetView } from './publicPet';

/** Render a printable lost-pet poster for a public token. Null if not found. */
export async function renderPetPoster(
  token: string,
): Promise<{ contentType: string; body: string } | null> {
  const view = await getPublicPetView(token);
  if (!view) return null;

  const publicUrl = `${getConfig().appUrl}/p/${token}`;
  const qr = await qrDataUrl(publicUrl);

  return getPosterGenerator().generate({
    pet: {
      name: view.name,
      species: view.species,
      breed: view.breed,
      color: view.color,
      description: view.description,
      photoUrl: view.photoUrl,
    },
    lost: {
      lastSeenLocation: view.lastSeenLocation,
      reward: view.reward,
      publicMessage: view.publicMessage,
    },
    publicUrl,
    qrDataUrl: qr,
  });
}

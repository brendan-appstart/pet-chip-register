import { getStorage } from '@/providers';

/** Read a stored object by key (used by the /media route). Null if missing. */
export async function readMedia(key: string): Promise<Buffer | null> {
  try {
    return await getStorage().get(key);
  } catch {
    return null;
  }
}

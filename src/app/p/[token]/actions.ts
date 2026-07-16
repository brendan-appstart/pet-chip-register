'use server';

import { redirect } from 'next/navigation';
import { contactViaPublicToken } from '@/services/publicPet';
import { getRequestContext } from '../../_lib/session';

export async function contactAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const ctx = await getRequestContext();
  const ack = await contactViaPublicToken({
    token,
    ipHash: ctx.ipHash,
    finder: {
      finderName: str(formData.get('finderName')),
      contact: str(formData.get('contact')),
      message: str(formData.get('message')),
      foundLocation: str(formData.get('foundLocation')),
    },
  });
  redirect(`/p/${encodeURIComponent(token)}?status=${ack.acknowledged ? 'ack' : 'rate'}`);
}

function str(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? undefined : s;
}

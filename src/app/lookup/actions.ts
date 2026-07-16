'use server';

import { redirect } from 'next/navigation';
import { lookupChip } from '@/services/lookup';
import { getRequestContext } from '../_lib/session';

export async function lookupAction(formData: FormData): Promise<void> {
  const chipNumber = String(formData.get('chipNumber') ?? '');
  const ctx = await getRequestContext();
  const ack = await lookupChip({
    chipNumber,
    ipHash: ctx.ipHash,
    finder: {
      finderName: str(formData.get('finderName')),
      contact: str(formData.get('contact')),
      message: str(formData.get('message')),
      foundLocation: str(formData.get('foundLocation')),
    },
  });

  if (!ack.acknowledged) {
    const status = ack.retryAfterSeconds ? 'rate' : 'invalid';
    redirect(`/lookup?status=${status}`);
  }
  redirect('/lookup?status=ack');
}

function str(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? undefined : s;
}

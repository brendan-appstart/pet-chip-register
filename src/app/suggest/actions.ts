'use server';

import { redirect } from 'next/navigation';
import { submitSuggestion } from '@/services/suggestions';
import { getRequestContext } from '../_lib/session';

export async function suggestAction(formData: FormData): Promise<void> {
  // Honeypot: automated bots fill hidden fields; real people leave them empty.
  // Silently accept so the bot gets no signal.
  if (String(formData.get('website') ?? '').trim() !== '') redirect('/suggest?status=sent');

  const ctx = await getRequestContext();
  const res = await submitSuggestion({
    title: String(formData.get('title') ?? ''),
    message: String(formData.get('message') ?? ''),
    email: String(formData.get('email') ?? '').trim() || undefined,
    ipHash: ctx.ipHash,
  });
  if (!res.ok) redirect(`/suggest?status=${res.error}`);
  redirect(
    `/suggest?status=sent${res.value.url ? `&url=${encodeURIComponent(res.value.url)}` : ''}`,
  );
}

'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from '@/config/env';
import { logout, requestMagicLink, SESSION_COOKIE, verifyMagicLink } from '@/services/auth';
import { getRequestContext } from '../_lib/session';

export async function requestMagicLinkAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const ctx = await getRequestContext();
  const res = await requestMagicLink({ email, ...ctx });
  if (!res.ok) {
    redirect(res.error === 'invalid_email' ? '/auth/request?error=invalid' : '/auth/request?error=rate');
  }
  redirect('/auth/request?sent=1');
}

export async function verifyMagicLinkAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const ctx = await getRequestContext();
  const res = await verifyMagicLink({ rawToken: token, ...ctx });
  if (!res.ok) redirect('/auth/verify?error=1');

  (await cookies()).set(SESSION_COOKIE, res.value.sessionToken, {
    httpOnly: true,
    secure: getConfig().isProduction,
    sameSite: 'lax',
    path: '/',
    expires: new Date(res.value.expiresAt),
  });
  redirect('/owner');
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  await logout(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect('/');
}

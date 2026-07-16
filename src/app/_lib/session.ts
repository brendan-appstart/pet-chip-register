import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { resolveSession, SESSION_COOKIE } from '@/services/auth';
import type { Owner, RequestContext } from '@/services/auth';
import { clientContext } from '@/services/context';
import { isAdmin } from '@/services/account';

/** The current signed-in owner, or null. */
export async function getCurrentOwner(): Promise<Owner | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSession(token);
}

/** Require a signed-in owner; redirect to sign-in otherwise. */
export async function requireOwner(): Promise<Owner> {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/auth/request');
  return owner;
}

/** Whether the given owner may access /admin. */
export async function isOwnerAdmin(owner: Owner | null): Promise<boolean> {
  if (!owner) return false;
  return isAdmin(owner.id);
}

/** Require an admin owner; 404 (hide existence) otherwise. */
export async function requireAdmin(): Promise<Owner> {
  const owner = await requireOwner();
  if (!(await isAdmin(owner.id))) notFound();
  return owner;
}

/** Best-effort client IP from proxy headers. */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? null;
  return h.get('x-real-ip');
}

/** Hashed request context (ip + user-agent) for services. */
export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  const ip = await getClientIp();
  return clientContext(ip, h.get('user-agent'));
}

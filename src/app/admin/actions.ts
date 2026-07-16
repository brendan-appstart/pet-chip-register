'use server';

import { redirect } from 'next/navigation';
import { seedDemoData } from '@/services/demo';
import { requireAdmin } from '../_lib/session';

export async function populateDemoAction(): Promise<void> {
  await requireAdmin();
  const result = await seedDemoData();
  redirect(
    `/admin?status=${result.alreadyPresent ? 'already' : 'seeded'}&n=${result.created.length}`,
  );
}

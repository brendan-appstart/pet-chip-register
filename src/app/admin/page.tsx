import { getConfig } from '@/config/env';
import { getRegistryStats } from '@/services/demo';
import { requireAdmin } from '../_lib/session';
import { populateDemoAction } from './actions';

export const metadata = { title: 'Admin — Open Pet Registry' };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; n?: string }>;
}) {
  await requireAdmin();
  const [stats, { status, n }] = await Promise.all([getRegistryStats(), searchParams]);
  const isProd = getConfig().isProduction;

  const tiles: { label: string; value: number }[] = [
    { label: 'Owners', value: stats.owners },
    { label: 'Pets', value: stats.pets },
    { label: 'Microchips', value: stats.microchips },
    { label: 'Lookups', value: stats.lookups },
  ];

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Admin</h1>
      <p className="muted">Registry overview and demo-data tools.</p>

      {status === 'seeded' && (
        <div className="banner ok">Added {n} demo pet(s). Reload stats below.</div>
      )}
      {status === 'already' && (
        <div className="banner ok">Demo data was already present — nothing to add.</div>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Registry stats</h2>
        <ul className="stat-grid">
          {tiles.map((t) => (
            <li key={t.label} className="stat">
              <span className="stat-value">{t.value}</span>
              <span className="stat-label">{t.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Demo data</h2>
        <p className="muted">
          Populate the registry with a handful of demo owners, pets, and microchips (one in Lost
          Mode) so you can try the flows. This is idempotent — running it again won&apos;t create
          duplicates.
        </p>
        {isProd && (
          <div className="banner error" role="alert">
            You&apos;re in production. Only add demo data to a non-production instance.
          </div>
        )}
        <form action={populateDemoAction}>
          <button className="btn" type="submit">
            Populate demo data
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Demo owner emails: <code>alice@example.org</code>, <code>bob@example.org</code>. Sign in at{' '}
          <a href="/auth/request">/auth/request</a> — the magic link prints to the server console
          and the dev email outbox.
        </p>
      </section>
    </div>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentOwner, isOwnerAdmin } from './_lib/session';
import { logoutAction } from './auth/actions';

export const metadata: Metadata = {
  title: 'Open Pet Registry',
  description:
    'A free, open-source, privacy-first lost-pet microchip registry. Reuniting lost pets with the people who love them.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const owner = await getCurrentOwner();
  const admin = await isOwnerAdmin(owner);
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container bar">
            <Link href="/" className="brand">
              <span className="paw" aria-hidden="true">
                🐾
              </span>{' '}
              Open Pet Registry
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link href="/lookup">Found a pet?</Link>
              {owner ? (
                <>
                  <Link href="/owner">My pets</Link>
                  {admin && <Link href="/admin">Admin</Link>}
                  <form action={logoutAction}>
                    <button className="btn ghost" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/auth/request" className="btn">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main id="main">
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            Free &amp; open-source pet-reunification infrastructure. Owner data is encrypted at rest
            and never sold. The success metric is pets reunited — not revenue.
          </div>
        </footer>
      </body>
    </html>
  );
}

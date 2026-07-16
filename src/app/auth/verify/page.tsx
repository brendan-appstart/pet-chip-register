import Link from 'next/link';
import { verifyMagicLinkAction } from '../actions';

export const metadata = { title: 'Confirm sign-in — Open Pet Registry' };

/**
 * The emailed link lands here (GET). We deliberately require an explicit POST to
 * consume the token, so link-prefetchers/scanners that issue a bare GET can't
 * burn a single-use link before the human clicks.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error || !token) {
    return (
      <div className="card stack" style={{ maxWidth: '34rem' }}>
        <h1>That link didn&apos;t work</h1>
        <div className="banner error">
          The sign-in link is invalid, already used, or expired. Please request a new one.
        </div>
        <Link href="/auth/request" className="btn">
          Get a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="card stack" style={{ maxWidth: '34rem' }}>
      <h1>Confirm sign-in</h1>
      <p className="muted">Click the button below to finish signing in to Open Pet Registry.</p>
      <form action={verifyMagicLinkAction}>
        <input type="hidden" name="token" value={token} />
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}

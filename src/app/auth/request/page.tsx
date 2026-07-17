import { oauthGoogleEnabled } from '@/services/oauth';
import { requestMagicLinkAction } from '../actions';

export const metadata = { title: 'Sign in — Open Pet Registry' };

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const googleEnabled = oauthGoogleEnabled();

  if (sent) {
    return (
      <div className="card stack" style={{ maxWidth: '34rem' }}>
        <h1>Check your email</h1>
        <div className="banner ok">
          If that email can receive mail, we&apos;ve sent a sign-in link. It expires in 15 minutes.
        </div>
        <p className="muted">
          In local development the link is printed to the server console and the dev email outbox.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '34rem' }}>
      <h1>Sign in or create an account</h1>
      <p className="muted">
        We use passwordless sign-in. Enter your email and we&apos;ll send you a one-time link — no
        password to remember or leak.
      </p>
      {error === 'invalid' && (
        <div className="banner error" role="alert">
          Please enter a valid email address.
        </div>
      )}
      {error === 'rate' && (
        <div className="banner error" role="alert">
          Too many requests. Please wait a few minutes and try again.
        </div>
      )}
      {error === 'oauth' && (
        <div className="banner error" role="alert">
          Google sign-in didn&apos;t complete. Please try again.
        </div>
      )}
      {error === 'email_unverified' && (
        <div className="banner error" role="alert">
          Your Google email isn&apos;t verified, so we can&apos;t sign you in with it. Try the email
          link instead.
        </div>
      )}
      {googleEnabled && (
        <>
          <a href="/auth/google" className="btn secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
            Continue with Google
          </a>
          <p className="muted" style={{ textAlign: 'center', margin: '1rem 0 0' }}>
            or use your email
          </p>
        </>
      )}
      <form action={requestMagicLinkAction} className="stack" style={{ marginTop: '1rem' }}>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <button className="btn" type="submit">
          Email me a sign-in link
        </button>
      </form>
    </div>
  );
}

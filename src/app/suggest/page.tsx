import { suggestionsEnabled } from '@/services/suggestions';
import { suggestAction } from './actions';

export const metadata = { title: 'Suggest a feature — Open Pet Registry' };

const ERRORS: Record<string, string> = {
  invalid: 'Please add a short title and a bit more detail.',
  rate_limited: 'Thanks for the ideas! Please wait a little while before sending more.',
  unavailable: 'Sorry — suggestions aren’t available right now. Please try again later.',
};

export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; url?: string }>;
}) {
  const { status, url } = await searchParams;

  if (status === 'sent') {
    return (
      <div className="card stack" style={{ maxWidth: '40rem' }}>
        <h1>Thank you! 🐾</h1>
        <div className="banner ok">
          Your suggestion was received. Ideas like yours help more pets get home.
        </div>
        {url && (
          <p className="muted">
            You can follow it here:{' '}
            <a href={url} target="_blank" rel="noreferrer">
              view the request
            </a>
            .
          </p>
        )}
        <a href="/suggest" className="btn ghost">
          Send another
        </a>
      </div>
    );
  }

  if (!suggestionsEnabled()) {
    return (
      <div className="card stack" style={{ maxWidth: '40rem' }}>
        <h1>Suggest a feature</h1>
        <p className="muted">
          Our suggestion box isn’t open just yet — please check back soon. In the meantime, thank
          you for wanting to help improve the registry.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '40rem' }}>
      <h1>Suggest a feature</h1>
      <p className="muted">
        Have an idea that would help reunite more pets? Tell us below — no account or login needed.
      </p>
      {status && status !== 'sent' && (
        <div className="banner error" role="alert">
          {ERRORS[status] ?? 'Something went wrong. Please try again.'}
        </div>
      )}
      <form action={suggestAction} className="stack" style={{ marginTop: '1rem' }}>
        {/* Honeypot — hidden from people, tempting to bots. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
          <label>
            Website<input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div className="field">
          <label htmlFor="title">Your idea, in a few words</label>
          <input id="title" name="title" required maxLength={140} placeholder="e.g. Text-message alerts" />
        </div>
        <div className="field">
          <label htmlFor="message">Tell us more</label>
          <textarea id="message" name="message" required maxLength={4000} />
        </div>
        <div className="field">
          <label htmlFor="email">Your email (optional — only if you’d like a reply)</label>
          <input id="email" name="email" type="email" />
        </div>
        <button className="btn" type="submit">
          Send suggestion
        </button>
      </form>
    </div>
  );
}

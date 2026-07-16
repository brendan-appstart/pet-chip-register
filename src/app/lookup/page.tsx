import { NEUTRAL_LOOKUP_ACK } from '@/domain/lookup/policy';
import { lookupAction } from './actions';

export const metadata = { title: 'Look up a microchip — Open Pet Registry' };

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === 'ack') {
    return (
      <div className="card stack" style={{ maxWidth: '40rem' }}>
        <div className="banner ok">{NEUTRAL_LOOKUP_ACK}</div>
        <p className="muted">
          Thank you for helping a pet get home. You can safely close this page.
        </p>
        <a href="/lookup" className="btn ghost">
          Look up another chip
        </a>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '40rem' }}>
      <h1>Found a pet?</h1>
      <p className="muted">
        Enter the microchip number from the pet&apos;s scan. If it&apos;s registered here, we&apos;ll
        notify the owner immediately. To protect everyone&apos;s privacy, we never tell you whether a
        chip is registered or who owns it.
      </p>

      {status === 'rate' && (
        <div className="banner error" role="alert">
          Too many lookups from your connection. Please wait a moment and try again.
        </div>
      )}
      {status === 'invalid' && (
        <div className="banner error" role="alert">
          That doesn&apos;t look like a microchip number. They&apos;re usually 9–15 digits.
        </div>
      )}

      <form action={lookupAction} className="stack" style={{ marginTop: '1rem' }}>
        <div className="field">
          <label htmlFor="chipNumber">Microchip number</label>
          <input
            id="chipNumber"
            name="chipNumber"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="e.g. 985141000000001"
          />
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="muted" style={{ padding: 0 }}>
            Optional — help the owner reach you. Your details go only to the owner, never shown
            publicly.
          </legend>
          <div className="field">
            <label htmlFor="finderName">Your name</label>
            <input id="finderName" name="finderName" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="contact">How to reach you (phone or email)</label>
            <input id="contact" name="contact" />
          </div>
          <div className="field">
            <label htmlFor="foundLocation">Where you found them</label>
            <input id="foundLocation" name="foundLocation" placeholder="e.g. near Oak St & 5th" />
          </div>
          <div className="field">
            <label htmlFor="message">Message for the owner</label>
            <textarea id="message" name="message" />
          </div>
        </fieldset>

        <button className="btn" type="submit">
          Notify the owner
        </button>
      </form>
    </div>
  );
}

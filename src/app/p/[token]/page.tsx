import { notFound } from 'next/navigation';
import { getPublicPetView } from '@/services/publicPet';
import { contactAction } from './actions';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getPublicPetView(token);
  if (!view) return { title: 'Pet not found' };
  return {
    title: view.isLost
      ? `LOST ${view.species}: ${view.name} — Open Pet Registry`
      : `${view.name} — Open Pet Registry`,
  };
}

export default async function PublicPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const view = await getPublicPetView(token);
  if (!view) notFound();

  return (
    <div className="stack" style={{ maxWidth: '44rem' }}>
      {view.isLost && (
        <div className="banner lost" role="alert">
          LOST {view.species.toUpperCase()}
        </div>
      )}

      <div className="card">
        <div className="grid two">
          <div>
            {view.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.photoUrl} alt={view.name} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <div className="pet-card">
                <div className="photo" aria-hidden="true">
                  🐾
                </div>
              </div>
            )}
          </div>
          <div>
            <h1 style={{ marginTop: 0 }}>{view.name}</h1>
            <p className="muted">{[view.breed, view.color, view.species].filter(Boolean).join(' · ')}</p>
            {view.isLost ? (
              <>
                {view.reward && <p><strong>Reward:</strong> {view.reward}</p>}
                {view.lastSeenLocation && <p><strong>Last seen:</strong> {view.lastSeenLocation}</p>}
                {view.publicMessage && <p>{view.publicMessage}</p>}
              </>
            ) : (
              <p className="muted">
                This pet is registered and loved. If you&apos;ve found them, reach the owner below —
                their contact details stay private.
              </p>
            )}
          </div>
        </div>
        {view.photos.filter((p) => p !== view.photoUrl).length > 0 && (
          <ul className="gallery" aria-label={`More photos of ${view.name}`}>
            {view.photos
              .filter((p) => p !== view.photoUrl)
              .map((url) => (
                <li key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${view.name}`} />
                </li>
              ))}
          </ul>
        )}
      </div>

      {status === 'ack' ? (
        <div className="card">
          <div className="banner ok">
            Thank you. We&apos;ve notified the owner — they may reach out to you. There&apos;s nothing
            more you need to do.
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Contact the owner</h2>
          {status === 'rate' && (
            <div className="banner error" role="alert">
              Too many messages from your connection. Please wait a moment and try again.
            </div>
          )}
          <p className="muted">
            Your details go only to the owner. We never show you their personal information.
          </p>
          <form action={contactAction} className="stack">
            <input type="hidden" name="token" value={view.token} />
            <div className="grid two">
              <div className="field">
                <label htmlFor="finderName">Your name</label>
                <input id="finderName" name="finderName" autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="contact">How to reach you</label>
                <input id="contact" name="contact" placeholder="Phone or email" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="foundLocation">Where you found them</label>
              <input id="foundLocation" name="foundLocation" />
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" placeholder={`I found ${view.name}!`} />
            </div>
            <button className="btn" type="submit">
              Notify the owner
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { listOwnerPets } from '@/services/pets';
import { getOwnerProfile } from '@/services/account';
import { mediaUrl } from '@/lib/media';
import { requireOwner } from '../_lib/session';
import { updateProfileAction } from './actions';

export const metadata = { title: 'My pets — Open Pet Registry' };

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const owner = await requireOwner();
  const [pets, profile, { status }] = await Promise.all([
    listOwnerPets(owner.id),
    getOwnerProfile(owner.id),
    searchParams,
  ]);

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>My pets</h1>
        <Link href="/owner/pets/new" className="btn">
          + Register a pet
        </Link>
      </div>

      {status === 'profile' && <div className="banner ok">Your contact details were updated.</div>}

      {pets.length === 0 ? (
        <div className="card">
          <p className="muted">
            You haven&apos;t registered any pets yet. Registering takes a minute and is free forever.
          </p>
          <Link href="/owner/pets/new" className="btn">
            Register your first pet
          </Link>
        </div>
      ) : (
        <ul className="pet-list">
          {pets.map((pet) => {
            const photo = mediaUrl(pet.photoStorageKey);
            return (
              <li key={pet.id}>
                <Link href={`/owner/pets/${pet.id}`} className="pet-card">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="photo" src={photo} alt={pet.name} />
                  ) : (
                    <div className="photo" aria-hidden="true">
                      🐾
                    </div>
                  )}
                  <div className="body">
                    <strong>{pet.name}</strong>
                    <div className="muted">{[pet.breed, pet.species].filter(Boolean).join(' · ')}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Your contact details</summary>
        <p className="muted">
          Signed in as <strong>{profile?.email}</strong>. These details are encrypted and only used
          to reach you about your pets.
        </p>
        <form action={updateProfileAction} className="stack" style={{ marginTop: '0.5rem' }}>
          <div className="field">
            <label htmlFor="displayName">Name</label>
            <input id="displayName" name="displayName" defaultValue={profile?.displayName ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" defaultValue={profile?.phone ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" defaultValue={profile?.address ?? ''} />
          </div>
          <button className="btn secondary" type="submit">
            Save contact details
          </button>
        </form>
      </details>
    </div>
  );
}

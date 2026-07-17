import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getConfig } from '@/config/env';
import { getOwnerPetDetail } from '@/services/pets';
import { qrDataUrl } from '@/lib/qr';
import { mediaUrl } from '@/lib/media';
import { requireOwner } from '../../../_lib/session';
import {
  addChipAction,
  addContactAction,
  archiveContactAction,
  deleteContactAction,
  editContactAction,
  setLostModeAction,
  unarchiveContactAction,
  updatePetAction,
  uploadPhotoAction,
} from '../../actions';

const STATUS: Record<string, { kind: 'ok' | 'error'; msg: string }> = {
  created: { kind: 'ok', msg: 'Pet registered. Add a photo, chip, and emergency contacts below.' },
  updated: { kind: 'ok', msg: 'Details updated.' },
  chip_added: { kind: 'ok', msg: 'Microchip added.' },
  contact_added: { kind: 'ok', msg: 'Emergency contact added.' },
  contact_updated: { kind: 'ok', msg: 'Contact updated.' },
  contact_archived: { kind: 'ok', msg: 'Contact archived.' },
  contact_unarchived: { kind: 'ok', msg: 'Contact restored.' },
  contact_deleted: { kind: 'ok', msg: 'Contact deleted.' },
  last_contact: { kind: 'error', msg: 'A pet must keep at least one emergency contact — add another before removing this one.' },
  lost_on: { kind: 'ok', msg: 'Lost Mode is ON. Print the poster and share the link below.' },
  lost_off: { kind: 'ok', msg: 'Marked as found — welcome home!' },
  photo: { kind: 'ok', msg: 'Photo updated.' },
  invalid_chip: { kind: 'error', msg: "That microchip number doesn't look valid." },
  chip_taken: { kind: 'error', msg: 'That microchip number is already registered.' },
  forbidden: { kind: 'error', msg: 'You are not allowed to modify this pet.' },
  photo_too_large: { kind: 'error', msg: 'That photo is too large (max 8MB).' },
};

export default async function PetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ petId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const owner = await requireOwner();
  const { petId } = await params;
  const { status } = await searchParams;
  const detail = await getOwnerPetDetail(owner.id, petId);
  if (!detail) notFound();

  const { pet, chips, contacts, photos, lostMode } = detail;
  const activeContacts = contacts.filter((c) => !c.archived);
  const archivedContacts = contacts.filter((c) => c.archived);
  const isLost = lostMode?.isLost ?? false;
  const publicUrl = `${getConfig().appUrl}/p/${pet.publicToken}`;
  const qr = await qrDataUrl(publicUrl);
  const photo = mediaUrl(pet.photoStorageKey);
  const banner = status ? STATUS[status] : undefined;

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/owner" className="btn ghost">
            ← My pets
          </Link>
          <h1 style={{ margin: '0.25rem 0 0' }}>{pet.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {[pet.breed, pet.color, pet.species].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <a href={publicUrl} className="btn secondary" target="_blank" rel="noreferrer">
            View public page
          </a>
        </div>
      </div>

      {banner && (
        <div className={`banner ${banner.kind}`} role="status">
          {banner.msg}
        </div>
      )}

      {isLost && (
        <div className="banner lost" role="alert">
          THIS PET IS IN LOST MODE
        </div>
      )}

      <div className="grid two">
        {/* Photos */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Photos</h2>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={pet.name} style={{ width: '100%', borderRadius: 8 }} />
          ) : (
            <div className="pet-card">
              <div className="photo" aria-hidden="true">
                🐾
              </div>
            </div>
          )}
          {photos.length > 0 && (
            <ul className="thumb-grid" aria-label={`${pet.name}'s photos`}>
              {photos.map((p) => (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`${pet.name} photo`} />
                </li>
              ))}
            </ul>
          )}
          <form action={uploadPhotoAction} className="stack" style={{ marginTop: '0.75rem' }}>
            <input type="hidden" name="petId" value={pet.id} />
            <div className="field">
              <label htmlFor="photos">
                Add photos — you can select several (EXIF/location is stripped automatically)
              </label>
              <input id="photos" name="photos" type="file" accept="image/*" multiple />
            </div>
            <button className="btn secondary" type="submit">
              Upload photos
            </button>
          </form>
        </div>

        {/* QR */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>QR tag</h2>
          <p className="muted">Print this on a collar tag. Scanning it opens the pet&apos;s public page — never your personal details.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code to this pet's public page" width={180} height={180} />
          <div className="stack" style={{ marginTop: '0.5rem' }}>
            <a href={qr} download={`${pet.name}-qr.png`} className="btn ghost">
              Download QR image
            </a>
            <a href={`/p/${pet.publicToken}/poster`} className="btn ghost" target="_blank" rel="noreferrer">
              Open printable poster
            </a>
          </div>
        </div>
      </div>

      {/* Lost mode */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lost Mode</h2>
        {isLost ? (
          <form action={setLostModeAction} className="stack">
            <input type="hidden" name="petId" value={pet.id} />
            <input type="hidden" name="isLost" value="false" />
            <p className="muted">
              {pet.name} is marked lost. When they&apos;re back home, mark them found to update the
              public page and poster.
            </p>
            <button className="btn" type="submit">
              Mark as found
            </button>
          </form>
        ) : (
          <form action={setLostModeAction} className="stack">
            <input type="hidden" name="petId" value={pet.id} />
            <input type="hidden" name="isLost" value="true" />
            <p className="muted">
              Turn this on if {pet.name} goes missing. It flips the public page to a LOST alert and
              enables a printable poster.
            </p>
            <div className="field">
              <label htmlFor="lastSeenLocation">Last seen (general area)</label>
              <input id="lastSeenLocation" name="lastSeenLocation" placeholder="Neighborhood or cross-streets" />
            </div>
            <div className="field">
              <label htmlFor="reward">Reward (optional)</label>
              <input id="reward" name="reward" />
            </div>
            <div className="field">
              <label htmlFor="publicMessage">Public message (optional)</label>
              <textarea id="publicMessage" name="publicMessage" placeholder="Friendly but shy; please don't chase." />
            </div>
            <button className="btn danger" type="submit">
              Turn on Lost Mode
            </button>
          </form>
        )}
      </div>

      {/* Microchips */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Microchips</h2>
        {chips.length === 0 ? (
          <p className="muted">No microchip on file yet.</p>
        ) : (
          <ul>
            {chips.map((c) => (
              <li key={c.id} className="chip-row">
                {c.number}
                {c.brand ? <span className="muted"> · {c.brand}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <form action={addChipAction} className="stack" style={{ marginTop: '0.5rem' }}>
          <input type="hidden" name="petId" value={pet.id} />
          <div className="grid two">
            <div className="field">
              <label htmlFor="chipNumber">Add a microchip number</label>
              <input id="chipNumber" name="chipNumber" inputMode="numeric" required />
            </div>
            <div className="field">
              <label htmlFor="brand">Brand (optional)</label>
              <input id="brand" name="brand" />
            </div>
          </div>
          <button className="btn secondary" type="submit">
            Add microchip
          </button>
        </form>
      </div>

      {/* Emergency contacts */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Emergency contacts</h2>
        {activeContacts.length === 0 ? (
          <p className="muted">No emergency contacts yet.</p>
        ) : (
          <ul className="contact-list">
            {activeContacts.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  {c.label ? <span className="tag" style={{ marginLeft: 8 }}>{c.label}</span> : null}
                  <div className="muted">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                <div className="contact-actions">
                  <details>
                    <summary className="btn ghost">Edit</summary>
                    <form action={editContactAction} className="stack" style={{ marginTop: '0.5rem' }}>
                      <input type="hidden" name="petId" value={pet.id} />
                      <input type="hidden" name="contactId" value={c.id} />
                      <div className="grid two">
                        <div className="field">
                          <label>Name<input name="name" defaultValue={c.name} required /></label>
                        </div>
                        <div className="field">
                          <label>Label<input name="label" defaultValue={c.label ?? ''} /></label>
                        </div>
                      </div>
                      <div className="grid two">
                        <div className="field">
                          <label>Phone<input name="phone" defaultValue={c.phone ?? ''} /></label>
                        </div>
                        <div className="field">
                          <label>Email<input name="email" type="email" defaultValue={c.email ?? ''} /></label>
                        </div>
                      </div>
                      <button className="btn secondary" type="submit">Save contact</button>
                    </form>
                  </details>
                  {activeContacts.length > 1 ? (
                    <>
                      <form action={archiveContactAction}>
                        <input type="hidden" name="petId" value={pet.id} />
                        <input type="hidden" name="contactId" value={c.id} />
                        <button className="btn ghost" type="submit">Archive</button>
                      </form>
                      <form action={deleteContactAction}>
                        <input type="hidden" name="petId" value={pet.id} />
                        <input type="hidden" name="contactId" value={c.id} />
                        <button className="btn ghost danger-text" type="submit">Delete</button>
                      </form>
                    </>
                  ) : (
                    <span className="muted" style={{ fontSize: '0.8rem' }}>Kept — a pet needs one contact</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {archivedContacts.length > 0 && (
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer' }} className="muted">
              Archived contacts ({archivedContacts.length})
            </summary>
            <ul className="contact-list">
              {archivedContacts.map((c) => (
                <li key={c.id}>
                  <div className="muted">
                    <strong>{c.name}</strong> {c.label ? `· ${c.label}` : ''}
                    <div>{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <div className="contact-actions">
                    <form action={unarchiveContactAction}>
                      <input type="hidden" name="petId" value={pet.id} />
                      <input type="hidden" name="contactId" value={c.id} />
                      <button className="btn ghost" type="submit">Restore</button>
                    </form>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="petId" value={pet.id} />
                      <input type="hidden" name="contactId" value={c.id} />
                      <button className="btn ghost danger-text" type="submit">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}

        <form action={addContactAction} className="stack" style={{ marginTop: '0.75rem' }}>
          <input type="hidden" name="petId" value={pet.id} />
          <div className="grid two">
            <div className="field">
              <label htmlFor="cname">Name</label>
              <input id="cname" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="clabel">Label</label>
              <input id="clabel" name="label" placeholder="Vet, Neighbor…" />
            </div>
          </div>
          <div className="grid two">
            <div className="field">
              <label htmlFor="cphone">Phone</label>
              <input id="cphone" name="phone" />
            </div>
            <div className="field">
              <label htmlFor="cemail">Email</label>
              <input id="cemail" name="email" type="email" />
            </div>
          </div>
          <button className="btn secondary" type="submit">
            Add contact
          </button>
        </form>
      </div>

      {/* Edit details */}
      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Edit details</summary>
        <form action={updatePetAction} className="stack" style={{ marginTop: '0.75rem' }}>
          <input type="hidden" name="petId" value={pet.id} />
          <div className="grid two">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={pet.name} required />
            </div>
            <div className="field">
              <label htmlFor="species">Species</label>
              <input id="species" name="species" defaultValue={pet.species} required />
            </div>
          </div>
          <div className="grid two">
            <div className="field">
              <label htmlFor="breed">Breed</label>
              <input id="breed" name="breed" defaultValue={pet.breed ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="color">Color</label>
              <input id="color" name="color" defaultValue={pet.color ?? ''} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="sex">Sex</label>
            <input id="sex" name="sex" defaultValue={pet.sex ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" defaultValue={pet.description ?? ''} />
          </div>
          <button className="btn secondary" type="submit">
            Save changes
          </button>
        </form>
      </details>
    </div>
  );
}

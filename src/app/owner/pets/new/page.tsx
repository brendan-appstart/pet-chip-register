import { requireOwner } from '../../../_lib/session';
import { registerPetAction } from '../../actions';

export const metadata = { title: 'Register a pet — Open Pet Registry' };

const ERRORS: Record<string, string> = {
  invalid_chip: "That microchip number doesn't look valid (usually 9–15 digits/letters).",
  chip_taken: 'That microchip number is already registered.',
};

export default async function NewPetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;

  return (
    <div className="card" style={{ maxWidth: '40rem' }}>
      <h1>Register a pet</h1>
      <p className="muted">Only a name and species are required. You can add the rest any time.</p>
      {error && (
        <div className="banner error" role="alert">
          {ERRORS[error] ?? 'Something went wrong. Please try again.'}
        </div>
      )}
      <form action={registerPetAction} className="stack" style={{ marginTop: '1rem' }}>
        <div className="grid two">
          <div className="field">
            <label htmlFor="name">Name *</label>
            <input id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="species">Species *</label>
            <input id="species" name="species" required placeholder="Dog, Cat, …" />
          </div>
        </div>
        <div className="grid two">
          <div className="field">
            <label htmlFor="breed">Breed</label>
            <input id="breed" name="breed" />
          </div>
          <div className="field">
            <label htmlFor="color">Color / markings</label>
            <input id="color" name="color" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sex">Sex</label>
          <input id="sex" name="sex" placeholder="Male / Female / Unknown" />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" placeholder="Distinguishing features, temperament…" />
        </div>
        <div className="field">
          <label htmlFor="chipNumber">Microchip number (optional)</label>
          <input id="chipNumber" name="chipNumber" inputMode="numeric" placeholder="985141000000001" />
          <div className="hint">You can add or change this later. It&apos;s stored encrypted.</div>
        </div>
        <button className="btn" type="submit">
          Register pet
        </button>
      </form>
    </div>
  );
}

import Link from 'next/link';

export const metadata = {
  title: 'Technical details — Open Pet Registry',
  description:
    'How the pet registry works under the hood: privacy, security, architecture, and open-source details.',
};

const REPO_URL = 'https://github.com/brendan-appstart/pet-chip-register';

export default function TechnicalPage() {
  return (
    <div className="stack" style={{ maxWidth: '46rem' }}>
      <div className="card">
        <h1>Technical details</h1>
        <p className="muted">
          For veterinarians, shelters, developers, and anyone curious about how the registry works
          under the hood. If you just want to protect or help a pet, you don&apos;t need anything on
          this page — head to <Link href="/">the home page</Link>.
        </p>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Privacy &amp; security</h2>
        <ul className="muted">
          <li>
            Owner information is <strong>encrypted at rest</strong> with a unique key per record; the
            master key is never stored in the database.
          </li>
          <li>
            Microchip numbers are stored only as one-way <strong>blind-index hashes</strong>, so a
            database leak is never a usable list of chips or people.
          </li>
          <li>
            A microchip lookup <strong>never reveals owner details</strong> to the searcher — it only
            notifies the owner. Match and no-match look identical.
          </li>
          <li>Every sensitive action is written to a tamper-evident audit log.</li>
          <li>Location metadata (EXIF/GPS) is stripped from uploaded pet photos.</li>
        </ul>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>One trusted registry</h2>
        <p className="muted">
          The whole point of a registry is that a lost pet and the person who finds them look in the
          same place. For that reason we run a <strong>single, central registry</strong> rather than
          many fragmented copies. The code is open, but please don&apos;t stand up a separate public
          registry unless you truly need to — a scattered set of databases makes lost pets harder to
          find, not easier.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>How it&apos;s built</h2>
        <ul className="muted">
          <li>Next.js + TypeScript, with a strict layered architecture.</li>
          <li>Turso / libSQL database (SQLite-compatible), portable by design.</li>
          <li>
            Every external service (email, storage, notifications) sits behind a replaceable
            interface — no single vendor is required.
          </li>
          <li>Designed to keep running for decades and to outlive any single maintainer.</li>
        </ul>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Open source</h2>
        <p className="muted">
          The software is open source under the AGPL-3.0 license, so the code — and the promise that
          it stays open — can always be audited.
        </p>
        <a className="btn ghost" href={REPO_URL} target="_blank" rel="noreferrer">
          View the source on GitHub →
        </a>
      </section>
    </div>
  );
}

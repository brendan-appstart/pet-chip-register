import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Free · Open source · Privacy-first</span>
          <h1>Every lost pet deserves a way home.</h1>
          <p className="lede">
            A microchip registry with one job: reuniting lost pets with the people who love them. No
            ads. No selling your data. Owner information is encrypted and never revealed just because
            someone has a chip number.
          </p>
          <div className="hero-cta">
            <Link href="/lookup" className="btn">
              I found a pet
            </Link>
            <Link href="/auth/request" className="btn secondary">
              Register my pet
            </Link>
          </div>
          <p className="hero-note">
            🔒 Encrypted owner data · 🐾 Always free to reunite · 🌍 Yours to self-host
          </p>
        </div>
        <div className="hero-media">
          <Image
            src="/hero.jpg"
            alt="A young woman gently greeting her golden retriever in the warm light of sunset"
            width={1600}
            height={1200}
            className="hero-img"
            priority
          />
          <p className="hero-credit">Photo: Pexels</p>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Found a pet with a chip?</h2>
          <p className="muted">
            Enter the microchip number. We&apos;ll notify the owner right away — you never have to
            handle anyone&apos;s personal details, and we never expose them to you.
          </p>
          <Link href="/lookup" className="btn ghost">
            Look up a microchip →
          </Link>
        </div>
        <div className="card">
          <h2>Protect your own pet</h2>
          <p className="muted">
            Register in minutes, add microchips and photos, print a QR tag, and flip on Lost Mode
            with a printable poster if they ever go missing. Always free.
          </p>
          <Link href="/auth/request" className="btn ghost">
            Get started →
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Built to last, built to trust</h2>
        <ul className="muted">
          <li>Core reunification features are free forever.</li>
          <li>Open-source software; private, encrypted data.</li>
          <li>No vendor lock-in — self-host it anywhere, own your registry.</li>
          <li>Designed to outlive any single company or maintainer.</li>
        </ul>
      </section>
    </div>
  );
}

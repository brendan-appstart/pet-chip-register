import Link from 'next/link';

export const metadata = {
  title: 'FAQ — Open Pet Registry',
  description:
    'Answers about how the free pet microchip registry works, how your privacy is protected, and our mission to reunite lost pets with their owners.',
};

interface QA {
  q: string;
  a: React.ReactNode;
}

const FAQS: QA[] = [
  {
    q: 'What is this, in one sentence?',
    a: (
      <>
        A free registry that links a pet&apos;s microchip to its owner, so that whoever finds a lost
        pet can get them home fast — while keeping the owner&apos;s personal details private.
      </>
    ),
  },
  {
    q: 'Will my data ever be shared or sold?',
    a: (
      <>
        <strong>No. Never.</strong> Your information is not sold, rented, or shared for advertising
        or any other purpose. This site was created and is funded for the sole purpose of helping
        reunite a lost dog, cat, rabbit, or any other pet with its loving owner — nothing else.
      </>
    ),
  },
  {
    q: 'How much does it cost?',
    a: (
      <>
        The features that get a pet home — registering, updating your details, microchip lookup,
        owner alerts, QR pages, and Lost Mode posters — are <strong>free forever</strong>. There are
        no ads.
      </>
    ),
  },
  {
    q: 'I found a pet with a microchip. What do I do?',
    a: (
      <>
        Go to <Link href="/lookup">Found a pet?</Link> and enter the microchip number. If the pet is
        registered, we notify the owner right away. You never have to handle anyone&apos;s personal
        details, and we never show them to you — you can optionally leave your contact info so the
        owner can reach out to you.
      </>
    ),
  },
  {
    q: 'If someone has my pet’s chip number, can they see my address or contact info?',
    a: (
      <>
        No. A microchip number alone reveals nothing about you. A lookup simply notifies you that
        someone found your pet; your name, address, phone, and email are never exposed to the person
        searching.
      </>
    ),
  },
  {
    q: 'How is my information kept safe?',
    a: (
      <>
        Your personal details are encrypted, and microchip numbers are stored as one-way codes — so
        even in the unlikely event of a data breach, there is no readable list of owners or chips.
        More detail is on the <Link href="/technical">technical page</Link>.
      </>
    ),
  },
  {
    q: 'Do I need an account to register my pet?',
    a: (
      <>
        Yes — a quick, passwordless sign-in with your email protects your pet&apos;s record so only
        you can update it. There&apos;s no password to remember or leak. Finders do not need an
        account.
      </>
    ),
  },
  {
    q: 'What is Lost Mode?',
    a: (
      <>
        One switch that turns your pet&apos;s public page into a LOST alert and gives you a printable
        poster with a QR code and last-seen details, so you can spread the word quickly.
      </>
    ),
  },
  {
    q: 'Is this tied to a specific microchip brand?',
    a: (
      <>
        No. You can register any microchip number here regardless of who made it or where it was
        implanted.
      </>
    ),
  },
  {
    q: 'What happens to the registry over the long term?',
    a: (
      <>
        It&apos;s deliberately built to keep working for decades and to not depend on any single
        company or person. The mission is measured in pets reunited — not revenue.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="stack" style={{ maxWidth: '46rem' }}>
      <div className="card">
        <h1>Frequently asked questions</h1>
        <p className="lede">
          This entire site exists for one reason: to help reunite a lost pet with the person who
          loves them. Your data is never shared or sold.
        </p>
      </div>

      <div className="card">
        {FAQS.map((item, i) => (
          <details key={i} className="faq-item">
            <summary>{item.q}</summary>
            <div className="faq-answer muted">{item.a}</div>
          </details>
        ))}
      </div>

      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          Still have a question? <Link href="/lookup">Found a pet?</Link> ·{' '}
          <Link href="/auth/request">Register your pet</Link> ·{' '}
          <Link href="/technical">Technical details</Link>
        </p>
      </div>
    </div>
  );
}

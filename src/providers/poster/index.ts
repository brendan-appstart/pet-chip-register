import { escapeHtml } from '@/lib/escape';

/**
 * Lost-pet poster generation. v1 returns a self-contained, print-ready HTML page
 * (the operator prints it or "Save as PDF") — zero binary dependencies, works
 * offline, and won't bit-rot. A headless-Chromium PDF adapter can implement the
 * same interface later with no change to callers.
 */
export interface PosterPetView {
  name: string;
  species: string;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
  photoUrl?: string | null;
}

export interface PosterLostView {
  lastSeenLocation?: string | null;
  reward?: string | null;
  publicMessage?: string | null;
}

export interface PosterInput {
  pet: PosterPetView;
  lost: PosterLostView;
  publicUrl: string;
  qrDataUrl: string;
  locale?: string;
}

export interface PosterGenerator {
  readonly name: string;
  generate(input: PosterInput): Promise<{ contentType: string; body: string }>;
}

function line(label: string, value?: string | null): string {
  if (!value) return '';
  return `<p class="row"><span class="label">${escapeHtml(label)}</span> ${escapeHtml(value)}</p>`;
}

export function createHtmlPosterGenerator(): PosterGenerator {
  return {
    name: 'html',
    async generate({ pet, lost, publicUrl, qrDataUrl, locale }) {
      const photo = pet.photoUrl
        ? `<img class="photo" src="${escapeHtml(pet.photoUrl)}" alt="${escapeHtml(pet.name)}" />`
        : `<div class="photo placeholder" aria-hidden="true">🐾</div>`;

      const body = `<!doctype html>
<html lang="${escapeHtml(locale ?? 'en')}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LOST ${escapeHtml(pet.species)}: ${escapeHtml(pet.name)}</title>
<style>
  :root { --ink: #17120e; --accent: #b91c1c; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  .sheet { width: 100%; max-width: 800px; margin: 0 auto; padding: 32px; }
  .banner { background: var(--accent); color: #fff; text-align: center; font-weight: 800; font-size: 56px; letter-spacing: 4px; padding: 12px; border-radius: 8px; }
  .name { text-align: center; font-size: 40px; font-weight: 800; margin: 16px 0 4px; }
  .subtitle { text-align: center; font-size: 20px; color: #6b5d52; margin: 0 0 20px; }
  .grid { display: grid; grid-template-columns: 1fr 220px; gap: 24px; align-items: start; }
  .photo { width: 100%; border-radius: 12px; object-fit: cover; max-height: 360px; }
  .photo.placeholder { display: flex; align-items: center; justify-content: center; font-size: 120px; background: #f3ede7; height: 300px; }
  .qr { text-align: center; }
  .qr img { width: 200px; height: 200px; }
  .qr .url { font-size: 12px; word-break: break-all; color: #6b5d52; margin-top: 8px; }
  .details { margin-top: 20px; font-size: 18px; line-height: 1.5; }
  .row { margin: 6px 0; }
  .label { font-weight: 700; }
  .reward { text-align: center; font-size: 24px; font-weight: 800; color: var(--accent); margin: 16px 0; }
  .cta { text-align: center; font-size: 20px; margin-top: 16px; }
  .print-hint { text-align: center; color: #6b5d52; font-size: 13px; margin-top: 24px; }
  @media print { .print-hint { display: none; } .sheet { padding: 12px; } @page { margin: 12mm; } }
</style>
</head>
<body>
  <main class="sheet">
    <div class="banner">LOST</div>
    <h1 class="name">${escapeHtml(pet.name)}</h1>
    <p class="subtitle">${escapeHtml([pet.breed, pet.color, pet.species].filter(Boolean).join(' · '))}</p>
    <div class="grid">
      <div>${photo}</div>
      <div class="qr">
        <img src="${escapeHtml(qrDataUrl)}" alt="Scan to contact the owner" />
        <div class="url">${escapeHtml(publicUrl)}</div>
      </div>
    </div>
    ${lost.reward ? `<p class="reward">Reward: ${escapeHtml(lost.reward)}</p>` : ''}
    <section class="details">
      ${line('Last seen:', lost.lastSeenLocation)}
      ${line('Description:', pet.description)}
      ${lost.publicMessage ? `<p class="row">${escapeHtml(lost.publicMessage)}</p>` : ''}
    </section>
    <p class="cta">Found this pet? Scan the code or visit the link above to contact the owner. Your contact details stay private.</p>
    <p class="print-hint">Tip: use your browser's Print → “Save as PDF” to share this poster.</p>
  </main>
</body>
</html>`;

      return { contentType: 'text/html; charset=utf-8', body };
    },
  };
}

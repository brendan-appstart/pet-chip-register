import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { expect, test } from '@playwright/test';

async function jpeg(color: string): Promise<Buffer> {
  return sharp({ create: { width: 48, height: 36, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

async function signIn(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/auth/request');
  await page.fill('#email', email);
  await page.getByRole('button', { name: /sign-in link/i }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect.poll(() => latestTo(email)?.text ?? null).not.toBeNull();
  await page.goto(verifyLink(latestTo(email)!.text));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/owner$/);
}

// The dev email transport appends every message to this JSONL outbox; we read it
// to fetch magic links and confirm owner notifications.
const OUTBOX = './var/e2e-outbox.jsonl';

interface OutboxMsg {
  to: string;
  subject: string;
  text: string;
}

function outbox(): OutboxMsg[] {
  if (!existsSync(OUTBOX)) return [];
  return readFileSync(OUTBOX, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as OutboxMsg);
}

function latestTo(to: string): OutboxMsg | undefined {
  return outbox().filter((m) => m.to === to).at(-1);
}

function verifyLink(text: string): string {
  const m = /(http:\/\/\S+\/auth\/verify\?token=\S+)/.exec(text);
  if (!m || !m[1]) throw new Error('no verify link in email');
  return m[1];
}

test('a finder looking up a seeded chip notifies the owner but sees only a neutral ack', async ({
  page,
}) => {
  await page.goto('/lookup');
  await page.fill('#chipNumber', '985141000000001'); // Milo, seeded to alice@example.org
  await page.fill('#message', 'Found near the dog park!');
  await page.getByRole('button', { name: 'Notify the owner' }).click();

  await expect(page.locator('.banner.ok')).toBeVisible();
  // The finder never sees the pet's name or the owner.
  await expect(page.locator('body')).not.toContainText('Milo');

  await expect
    .poll(() => latestTo('alice@example.org')?.text ?? '')
    .toContain('Found near the dog park!');
});

test('owner signs up, registers a pet, enables lost mode, and gets a public LOST page + poster', async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.org`;
  await signIn(page, email);

  // Register a pet.
  await page.goto('/owner/pets/new');
  await page.fill('#name', 'Scout');
  await page.fill('#species', 'Dog');
  await page.getByRole('button', { name: 'Register pet' }).click();
  await expect(page).toHaveURL(/\/owner\/pets\//);
  await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();

  // Upload multiple photos and see them in the gallery.
  await page.setInputFiles('#photos', [
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: await jpeg('goldenrod') },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: await jpeg('sienna') },
  ]);
  await page.getByRole('button', { name: 'Upload photos' }).click();
  await expect(page.locator('.thumb-grid img')).toHaveCount(2);

  // Turn on Lost Mode.
  await page.fill('#lastSeenLocation', 'Cedar Park');
  await page.getByRole('button', { name: 'Turn on Lost Mode' }).click();
  await expect(page.locator('.banner.lost')).toBeVisible();

  // Public page shows the LOST alert.
  const publicHref = await page
    .getByRole('link', { name: 'View public page' })
    .getAttribute('href');
  expect(publicHref).toBeTruthy();
  await page.goto(publicHref!);
  await expect(page.locator('.banner.lost')).toBeVisible();
  await expect(page.locator('body')).toContainText('Cedar Park');

  // The printable poster renders with a QR image.
  await page.goto(`${publicHref}/poster`);
  await expect(page.locator('.banner')).toContainText('LOST');
  await expect(page.locator('img[alt="Scan to contact the owner"]')).toBeVisible();
});

test('an admin can populate demo data and see registry stats', async ({ page }) => {
  await signIn(page, `admin-${Date.now()}@example.org`); // dev mode → any owner is admin
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  await expect(page.locator('.stat-grid .stat')).toHaveCount(4);

  await page.getByRole('button', { name: 'Populate demo data' }).click();
  await expect(page.locator('.banner.ok')).toBeVisible();
  // Stats reflect the seeded demo pets.
  await expect(page.locator('.stat').filter({ hasText: 'Pets' })).toContainText(/[1-9]/);
});

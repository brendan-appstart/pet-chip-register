import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Generate the cryptographic keys this instance needs and write them into .env,
 * creating .env from .env.example on first run. Existing keys are NEVER
 * overwritten (overwriting the KEK would strand all encrypted data), so this is
 * safe to re-run. Keys are not printed, to avoid leaking them into logs.
 */
const ENV = '.env';
const EXAMPLE = '.env.example';

if (!existsSync(ENV)) {
  if (!existsSync(EXAMPLE)) {
    console.error('Neither .env nor .env.example exists; cannot generate keys.');
    process.exit(1);
  }
  copyFileSync(EXAMPLE, ENV);
  console.log('Created .env from .env.example');
}

let content = readFileSync(ENV, 'utf8');

function setIfEmpty(key: string, value: string): boolean {
  const re = new RegExp(`^${key}=(.*)$`, 'm');
  const match = re.exec(content);
  if (!match) {
    content += `\n${key}=${value}\n`;
    return true;
  }
  if (match[1]?.trim() === '') {
    content = content.replace(re, `${key}=${value}`);
    return true;
  }
  return false;
}

const activeId = /^OPR_KEK_ACTIVE_ID=(.+)$/m.exec(content)?.[1]?.trim() || 'k1';
setIfEmpty('OPR_KEK_ACTIVE_ID', activeId);
const wroteKek = setIfEmpty(`OPR_KEK_${activeId}`, randomBytes(32).toString('base64'));
const wroteIndex = setIfEmpty('OPR_INDEX_KEY', randomBytes(32).toString('base64'));

writeFileSync(ENV, content);

if (wroteKek || wroteIndex) {
  console.log(`✓ Wrote ${[wroteKek && 'KEK', wroteIndex && 'index pepper'].filter(Boolean).join(' + ')} to .env`);
} else {
  console.log('✓ Keys already present in .env — nothing changed.');
}

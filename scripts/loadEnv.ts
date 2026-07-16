import { existsSync } from 'node:fs';

/**
 * Load environment files for CLI scripts (dev/seed/migrate). The Next.js runtime
 * loads .env itself; this is only for standalone `tsx` scripts. `.env.local`
 * overrides `.env`. Uses Node's built-in loader — no dependency required.
 */
export function loadEnv(): void {
  for (const file of ['.env', '.env.local']) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
    }
  }
}

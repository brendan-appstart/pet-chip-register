import { loadEnv } from './loadEnv';

loadEnv();

const { getConfig } = await import('@/config/env');
if (getConfig().isProduction) {
  console.error('Refusing to seed in production (NODE_ENV=production).');
  process.exit(1);
}

const { seedDemoData } = await import('@/services/demo');
const result = await seedDemoData();

console.log('\n✓ Seed complete.\n');
if (result.alreadyPresent) {
  console.log('(Demo pets already existed — chip numbers are taken. Reset with a fresh DB to reseed.)');
} else {
  console.log('Demo pets:');
  for (const d of result.created) {
    console.log(
      `  • ${d.pet}${d.lost ? ' (LOST)' : ''} — owner ${d.owner}\n      chip:   ${d.chip}\n      public: ${getConfig().appUrl}/p/${d.publicToken}`,
    );
  }
}
console.log('\nTry it:');
console.log('  1. Visit /lookup and enter a chip number above → the owner alert prints to the console/outbox.');
console.log('  2. Sign in at /auth/request with alice@example.org or bob@example.org → the magic link prints to the console/outbox.');
console.log('  3. Sign in, then visit /admin to populate more demo data and see registry stats.');
console.log('');
process.exit(0);

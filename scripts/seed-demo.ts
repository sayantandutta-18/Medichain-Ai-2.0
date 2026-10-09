import { seed } from '../backend/scripts/seed.js';

console.log('[Runner] Executing MediChain-AI Root Demo Seed Script...');
seed()
  .then(() => {
    console.log('[Runner] Demo database seeding process completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Runner] Seed error:', err);
    process.exit(1);
  });

/**
 * Bootstrap entry point
 *
 * Loads Vault secrets into process.env BEFORE config/index.js evaluates,
 * then starts the Express app via dynamic import.
 *
 * Top-level await is supported in Node 18+ ESM modules.
 */
import { loadVaultSecrets } from './config/vault.js';
import { execSync } from 'child_process';

await loadVaultSecrets();

// Run migrations now that DATABASE_URL is available (set by loadVaultSecrets).
// Only in production — dev uses docker-entrypoint.sh which runs migrate dev.
if (process.env.NODE_ENV === 'production') {
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  } catch (err) {
    console.error('[startup] prisma migrate deploy failed — refusing to start');
    process.exit(1);
  }
}

await import('./index.js');

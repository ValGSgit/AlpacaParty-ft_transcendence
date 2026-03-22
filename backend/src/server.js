/**
 * Bootstrap entry point
 *
 * Loads Vault secrets into process.env BEFORE config/index.js evaluates,
 * then starts the Express app via dynamic import.
 *
 * Top-level await is supported in Node 18+ ESM modules.
 */
import { loadVaultSecrets } from './config/vault.js';

await loadVaultSecrets();

await import('./index.js');

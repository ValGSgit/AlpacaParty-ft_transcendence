/**
 * HashiCorp Vault client
 * @owner ValGSgit
 *
 * Fetches secrets from Vault KV v2 at startup and writes them into process.env
 * before any other module reads configuration.
 *
 * Production behaviour (NODE_ENV=production):
 *   - VAULT_ADDR and VAULT_TOKEN are required. Startup throws if either is absent.
 *   - Vault values ALWAYS overwrite whatever was in the environment — Vault is the
 *     single source of truth. Secrets must NOT be passed as Docker env vars in prod.
 *   - If Vault is unreachable the process throws rather than starting with stale/no secrets.
 *
 * Development behaviour (any other NODE_ENV):
 *   - Vault is optional. Missing VAULT_ADDR/VAULT_TOKEN just skips the fetch.
 *   - Only absent or placeholder values are overwritten, so a local .env still works.
 *   - Network errors produce a warning and the app falls back to env vars.
 */

const VAULT_PATH = 'secret/data/alpacaparty';

// Dev-mode placeholder values that Vault should replace.
const DEV_PLACEHOLDERS = new Set([
  'changeme',
  'test-api-key',
  'dev-secret-change-me',
  'YouCouldLeaveThisAsIsIDGAF',
  '',
]);

// Vault key → environment variable name.
// Add new secrets here AND to vault/init/seed.sh.
const KEY_MAP = {
  db_password:          'DB_PASSWORD',
  db_user:              'DB_USER',
  db_name:              'DB_NAME',
  jwt_secret:           'JWT_SECRET',
  api_keys:             'API_KEYS',
  groq_api_key:         'GROQ_API_KEY',
  huggingface_api_key:  'HUGGINGFACE_API_KEY',
  google_client_id:     'GOOGLE_CLIENT_ID',
  google_client_secret: 'GOOGLE_CLIENT_SECRET',
  github_client_id:     'GITHUB_CLIENT_ID',
  github_client_secret: 'GITHUB_CLIENT_SECRET',
};

/**
 * Load secrets from Vault and inject into process.env.
 * Must be called once at the very start of server.js, before any other import
 * that reads process.env (especially config/index.js and config/prisma.js).
 */
export async function loadVaultSecrets() {
  // Read at call time — NOT at module load time. Module-scope reads get captured
  // before Docker injects the real values, which breaks secret resolution.
  const vaultAddr  = process.env.VAULT_ADDR;
  const vaultToken = process.env.VAULT_TOKEN;
  const isProd     = process.env.NODE_ENV === 'production';

  if (!vaultAddr || !vaultToken) {
    if (isProd) {
      throw new Error('[vault] VAULT_ADDR and VAULT_TOKEN must be set in production');
    }
    console.info('[vault] VAULT_ADDR/VAULT_TOKEN not set — skipping Vault, using env vars directly.');
    return;
  }

  let data;
  try {
    const res = await fetch(`${vaultAddr}/v1/${VAULT_PATH}`, {
      headers: { 'X-Vault-Token': vaultToken },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    // KV v2 nests the actual payload under data.data
    data = json?.data?.data ?? {};
  } catch (err) {
    const msg = `[vault] Cannot reach Vault at ${vaultAddr}: ${err.message}`;
    if (isProd) {
      throw new Error(`${msg} — refusing to start without secrets`);
    }
    console.warn(msg);
    console.warn('[vault] Falling back to environment variables.');
    return;
  }

  let injected = 0;

  for (const [vaultKey, envKey] of Object.entries(KEY_MAP)) {
    const value = data[vaultKey];
    if (value === undefined) continue;

    if (isProd) {
      // Production: Vault is the single source of truth — always overwrite.
      process.env[envKey] = value;
      injected++;
    } else {
      // Development: only fill in absent or placeholder values so local .env still works.
      if (!process.env[envKey] || DEV_PLACEHOLDERS.has(process.env[envKey])) {
        process.env[envKey] = value;
        injected++;
      }
    }
  }

  // Reconstruct DATABASE_URL from the (now Vault-sourced) credentials so it is
  // never embedded in the container environment and always stays in sync with
  // DB_PASSWORD. DB_HOST and DB_PORT are infrastructure config (not secrets) and
  // come from the compose env.
  const dbUser     = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName     = process.env.DB_NAME;
  const dbHost     = process.env.DB_HOST || 'postgres';
  const dbPort     = process.env.DB_PORT || '5432';

  if (dbUser && dbPassword && dbName) {
    process.env.DATABASE_URL =
      `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  }

  console.info(
    `[vault] Loaded ${Object.keys(data).length} secret(s) from ${vaultAddr}; ` +
    `injected ${injected} into process.env`,
  );
}

/**
 * HashiCorp Vault client
 * @owner ValGSgit
 *
 * Fetches secrets from Vault KV v2 at startup and merges them into
 * process.env so the rest of the app needs no changes.
 *
 * Falls back gracefully when VAULT_ADDR is not set (CI, local without Docker).
 */

const VAULT_ADDR  = process.env.VAULT_ADDR;
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const VAULT_PATH  = 'secret/data/alpacaparty';

// Mapping from Vault key → process.env variable name.
// Only keys that are NOT already set in the environment will be overwritten.
const KEY_MAP = {
  db_password:           'DB_PASSWORD',
  db_user:               'DB_USER',
  db_name:               'DB_NAME',
  jwt_secret:            'JWT_SECRET',
  api_keys:              'API_KEYS',
  groq_api_key:          'GROQ_API_KEY',
  huggingface_api_key:   'HUGGINGFACE_API_KEY',
  google_client_id:      'GOOGLE_CLIENT_ID',
  google_client_secret:  'GOOGLE_CLIENT_SECRET',
  github_client_id:      'GITHUB_CLIENT_ID',
  github_client_secret:  'GITHUB_CLIENT_SECRET',
};

/**
 * Load secrets from Vault and inject into process.env.
 * Call once before config/index.js reads process.env.
 */
export async function loadVaultSecrets() {
  if (!VAULT_ADDR || !VAULT_TOKEN) {
    console.info('[vault] VAULT_ADDR/VAULT_TOKEN not set — skipping Vault, using env vars directly.');
    return;
  }

  const url = `${VAULT_ADDR}/v1/${VAULT_PATH}`;
  let data;
  try {
    const res = await fetch(url, {
      headers: { 'X-Vault-Token': VAULT_TOKEN },
    });
    if (!res.ok) {
      throw new Error(`Vault responded with HTTP ${res.status}`);
    }
    const json = await res.json();
    // KV v2 wraps the payload under data.data
    data = json?.data?.data ?? {};
  } catch (err) {
    console.warn(`[vault] Could not reach Vault at ${VAULT_ADDR}: ${err.message}`);
    console.warn('[vault] Falling back to environment variables.');
    return;
  }

  let injected = 0;
  for (const [vaultKey, envKey] of Object.entries(KEY_MAP)) {
    const value = data[vaultKey];
    if (value !== undefined && value !== '') {
      // Only override if env var is absent or equals the dev default placeholder.
      if (!process.env[envKey] || process.env[envKey] === 'changeme') {
        process.env[envKey] = value;
        injected++;
      }
    }
  }
  console.info(`[vault] Loaded ${injected} secret(s) from ${VAULT_ADDR}`);
}

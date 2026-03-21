/**
 * vault.js — loads the Groq API key from HashiCorp Vault KV v2.
 *
 * Uses the same VAULT_ADDR / VAULT_TOKEN / path as the backend so a single
 * Vault secret covers the whole mono-repo.  Falls back silently when Vault is
 * not available (CI, local dev without Docker) so the server always starts.
 *
 * Call once at startup, before server.listen().
 */

const VAULT_ADDR  = process.env.VAULT_ADDR;
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const VAULT_PATH  = 'secret/data/alpacaparty';

export async function loadVaultSecrets() {
  if (!VAULT_ADDR || !VAULT_TOKEN) {
    console.info('[vault] VAULT_ADDR/VAULT_TOKEN not set — using env vars directly.');
    return;
  }

  const url = `${VAULT_ADDR}/v1/${VAULT_PATH}`;
  let data;
  try {
    const res = await fetch(url, { headers: { 'X-Vault-Token': VAULT_TOKEN } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    data = json?.data?.data ?? {};
  } catch (err) {
    console.warn(`[vault] Could not reach Vault: ${err.message} — falling back to env vars.`);
    return;
  }

  const key = data.groq_api_key;
  if (key && (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'changeme')) {
    process.env.GROQ_API_KEY = key;
    console.info('[vault] GROQ_API_KEY injected from Vault.');
  } else {
    console.info('[vault] GROQ_API_KEY already set or not found in Vault — no override.');
  }
}

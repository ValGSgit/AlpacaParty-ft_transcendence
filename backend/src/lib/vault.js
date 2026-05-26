import fs from "fs";
import https from "node:https";
import { URL } from "node:url";

const VAULT_ADDR = process.env.VAULT_ADDR || "https://vault:8200";
const KEYS_FILE = "/run/vault-keys/keys.env";
const CA_PATH = process.env.NODE_EXTRA_CA_CERTS || "/app/ssl/cert.pem";

// Cached token. Read once on the first hit (after vault-init has written it),
// reuse for every subsequent request. The token doesn't rotate during the
// backend's lifetime — if you re-seed Vault, restart the backend.
let cachedToken = null;

function readTokenFromDisk() {
  if (!fs.existsSync(KEYS_FILE)) {
    throw new Error(`Vault keys file not found: ${KEYS_FILE}`);
  }
  const content = fs.readFileSync(KEYS_FILE, "utf8");
  const match = content.match(/^VAULT_TOKEN=(.+)$/m);
  if (!match) throw new Error("VAULT_TOKEN not found in keys file");
  return match[1].trim();
}

function getVaultToken() {
  if (cachedToken) return cachedToken;
  cachedToken = readTokenFromDisk();
  return cachedToken;
}

/**
 * Block until the Vault token file is present (or give up). Use at boot
 * when the backend may race vault-init. Returns the token on success;
 * throws if the file still isn't there after `timeoutMs`.
 *
 * Polling beats a single readyz probe here because the keys.env file is
 * the actual contract — Vault being healthy doesn't imply vault-init
 * has finished writing the token.
 */
export async function waitForVaultToken({ timeoutMs = 60_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      cachedToken = readTokenFromDisk();
      return cachedToken;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error(`Vault token not available after ${timeoutMs}ms: ${lastErr?.message || "unknown"}`);
}

function vaultRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const token = getVaultToken();
    const url = new URL(`${VAULT_ADDR}/v1/${path}`);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: parseInt(url.port, 10) || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "X-Vault-Token": token,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    if (CA_PATH && fs.existsSync(CA_PATH)) {
      options.ca = fs.readFileSync(CA_PATH);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode === 404) {
          resolve(null);
          return;
        }
        if (res.statusCode === 204 || data.trim() === "") {
          resolve({});
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Vault responded with ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Vault response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const Vault = {
  /**
   * Read a KV v2 secret. Returns the data object or null if not found.
   * @param {string} path  e.g. "secret/data/alpacaparty/admins/42"
   */
  async read(path) {
    const json = await vaultRequest("GET", path);
    if (!json) return null;
    return json.data?.data ?? json.data ?? null;
  },

  /**
   * Write (create/update) a KV v2 secret.
   * @param {string} path  e.g. "secret/data/alpacaparty/admins/42"
   * @param {object} data  Key-value pairs to store
   */
  async write(path, data) {
    await vaultRequest("POST", path, { data });
  },

  /**
   * Delete all versions of a KV v2 secret (metadata delete).
   * @param {string} metaPath  e.g. "secret/metadata/alpacaparty/admins/42"
   */
  async delete(metaPath) {
    await vaultRequest("DELETE", metaPath);
  },
};

export default Vault;

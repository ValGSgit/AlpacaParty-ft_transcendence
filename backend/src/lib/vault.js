import fs from "fs";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const VAULT_ADDR = process.env.VAULT_ADDR || "http://vault:8200";
const CA_PATH = process.env.NODE_EXTRA_CA_CERTS || "/app/ssl/cert.pem";

function getVaultToken() {
  const token = process.env.VAULT_TOKEN;
  if (!token) throw new Error("VAULT_TOKEN env var is not set");
  return token;
}

function vaultRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${VAULT_ADDR}/v1/${path}`);
    const client = url.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: parseInt(url.port, 10) || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "X-Vault-Token": getVaultToken(),
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    if (url.protocol === "https:" && CA_PATH && fs.existsSync(CA_PATH)) {
      options.ca = fs.readFileSync(CA_PATH);
    }

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode === 404) return resolve(null);
        if (res.statusCode === 204 || data.trim() === "") return resolve({});
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Vault responded with ${res.statusCode}: ${data}`));
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
  /** Read a KV v2 secret. Returns the data object or null if not found. */
  async read(path) {
    const json = await vaultRequest("GET", path);
    if (!json) return null;
    return json.data?.data ?? json.data ?? null;
  },

  /** Write (create/update) a KV v2 secret. */
  async write(path, data) {
    await vaultRequest("POST", path, { data });
  },

  /** Delete all versions of a KV v2 secret (metadata delete). */
  async delete(metaPath) {
    await vaultRequest("DELETE", metaPath);
  },
};

export default Vault;

import fs from "fs";
import https from "node:https";
import { URL } from "node:url";

// Vault key → environment variable name.
// Must stay in sync with vault/init/seed.sh and config/index.js.
const KEY_MAP = {
  db_password: "DB_PASSWORD",
  db_user: "DB_USER",
  db_name: "DB_NAME",
  jwt_secret: "JWT_SECRET",
  jwt_refresh_secret: "JWT_REFRESH_SECRET",
  jwt_public_api_secret: "JWT_PUBLIC_API_SECRET",
  api_keys: "API_KEYS",
  google_client_id: "GOOGLE_CLIENT_ID",
  google_client_secret: "GOOGLE_CLIENT_SECRET",
  github_client_id: "GITHUB_CLIENT_ID",
  github_client_secret: "GITHUB_CLIENT_SECRET",
};

/**
 * Performs a GET request to the Vault HTTPS endpoint using a custom CA cert
 * instead of disabling TLS verification globally.
 *
 * NODE_EXTRA_CA_CERTS is set in compose.prod.yaml but may not be resolved by
 * Node's TLS layer before this short-lived helper process starts (timing
 * issue with some Alpine Node builds). Using https.request with an explicit
 * `ca` option is reliable regardless of env-var timing.
 */
function vaultGet(url, token, caPath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parseInt(parsed.port, 10) || 443,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: { "X-Vault-Token": token },
    };

    if (caPath && fs.existsSync(caPath)) {
      options.ca = fs.readFileSync(caPath);
    }

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Vault responded with ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse Vault response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function getSecrets() {
  const { VAULT_ADDR, VAULT_TOKEN } = process.env;
  const targetFile = "/run/secrets/.env";
  const caPath = process.env.NODE_EXTRA_CA_CERTS || "/app/ssl/cert.pem";

  try {
    const VAULT_PATH = "secret/data/alpacaparty";

    const json = await vaultGet(
      `${VAULT_ADDR}/v1/${VAULT_PATH}`,
      VAULT_TOKEN,
      caPath,
    );
    const rawSecrets = json.data.data || json.data;

    // Map Vault keys to their canonical uppercase env var names.
    const mapped = {};
    for (const [vaultKey, value] of Object.entries(rawSecrets)) {
      const envKey = KEY_MAP[vaultKey] || vaultKey;
      mapped[envKey] = value;
    }

    buildDatabaseUrl(mapped);

    // Convert to KEY="VALUE" format for .env
    const envContent = Object.entries(mapped)
      .map(([k, v]) => `${k}="${v}"`)
      .join("\n");

    if (!fs.existsSync("/run/secrets"))
      fs.mkdirSync("/run/secrets", { recursive: true });
    fs.writeFileSync(targetFile, envContent);
    fs.chmodSync(targetFile, 0o600);
    console.log("Secrets loaded to RAM (.env)");
  } catch (err) {
    console.error("Vault Fetch Failed:", err.message);
    process.exit(1);
  }
}

function buildDatabaseUrl(secrets) {
  const dbUser = secrets.DB_USER;
  const dbPassword = secrets.DB_PASSWORD;
  const dbName = secrets.DB_NAME || process.env.DB_NAME;
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;

  if (!dbUser || !dbPassword || !dbName || !dbHost || !dbPort) {
    throw new Error(
      "Missing DB connection fields required to build DATABASE_URL",
    );
  }

  secrets.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

getSecrets();

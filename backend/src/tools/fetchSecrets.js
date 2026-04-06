import fs from "fs";

// Vault key → environment variable name.
// Must stay in sync with vault/init/seed.sh and config/index.js.
const KEY_MAP = {
  db_password: "DB_PASSWORD",
  db_user: "DB_USER",
  db_name: "DB_NAME",
  jwt_secret: "JWT_SECRET",
  api_keys: "API_KEYS",
  groq_api_key: "GROQ_API_KEY",
  huggingface_api_key: "HUGGINGFACE_API_KEY",
  google_client_id: "GOOGLE_CLIENT_ID",
  google_client_secret: "GOOGLE_CLIENT_SECRET",
  github_client_id: "GITHUB_CLIENT_ID",
  github_client_secret: "GITHUB_CLIENT_SECRET",
  mod_users: "MOD_USERS",
};

async function getSecrets() {
  const { VAULT_ADDR, VAULT_TOKEN } = process.env;
  const targetFile = "/run/secrets/.env";

  try {
    const VAULT_PATH = "secret/data/alpacaparty";

    // Accept the self-signed Vault cert for this script only.
    // NODE_EXTRA_CA_CERTS is already set in compose.prod.yaml, but the
    // entrypoint runs before that takes effect for some Node builds.
    // Scoped to this short-lived helper process — the main app does NOT
    // disable TLS verification.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const res = await fetch(`${VAULT_ADDR}/v1/${VAULT_PATH}`, {
      headers: { "X-Vault-Token": VAULT_TOKEN },
    });

    if (!res.ok) throw new Error(`Vault responded with ${res.status}`);

    const json = await res.json();
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

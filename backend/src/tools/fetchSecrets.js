import fs from "fs";

async function getSecrets() {
  const { VAULT_ADDR, VAULT_TOKEN } = process.env;
  const targetFile = "/run/secrets/.env";

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //! only here because of a self signed https cert
    const VAULT_PATH = "secret/data/alpacaparty";
    const res = await fetch(`${VAULT_ADDR}/v1/${VAULT_PATH}`, {
      headers: { "X-Vault-Token": VAULT_TOKEN },
    });

    if (!res.ok) throw new Error(`Vault responded with ${res.status}`);

    const json = await res.json();
    const secrets = json.data.data || json.data;

    createDatabaseUrl(secrets);

    // Convert JSON to KEY="VALUE" format for .env
    const envContent = Object.entries(secrets)
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

function createDatabaseUrl(secrets) {
  const dbUser = secrets.db_user;
  const dbPassword = secrets.db_password;
  const dbName = process.env.DB_NAME;
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  secrets.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

getSecrets();

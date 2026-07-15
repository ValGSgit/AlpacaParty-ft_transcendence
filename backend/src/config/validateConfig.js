import config from "./index.js";

const requireConfig = (value, name) => {
  if (value == null || Number.isNaN(value) || value === "") {
    throw new Error(`Missing required configuration: ${name}`);
  }
};

export const validateConfig = () => {
  // Server
  requireConfig(config.port, "API_PORT");
  requireConfig(config.nodeEnv, "NODE_ENV");

  // Database
  requireConfig(config.db.host, "DB_HOST");
  requireConfig(config.db.port, "DB_PORT");
  requireConfig(config.db.name, "DB_NAME");
  requireConfig(config.db.user, "DB_USER");
  requireConfig(config.db.password, "DB_PASSWORD");

  // JWT
  requireConfig(config.jwt.secret, "JWT_SECRET");
  requireConfig(config.jwt.refreshSecret, "JWT_REFRESH_SECRET");
  requireConfig(config.jwt.publicApiSecret, "JWT_PUBLIC_API_SECRET");
  requireConfig(config.jwt.expiresIn, "JWT_EXPIRES_IN");
  requireConfig(config.jwt.refreshExpiresIn, "JWT_REFRESH_EXPIRES_IN");
  requireConfig(config.jwt.publicApiExpiresIn, "JWT_PUBLIC_API_EXPIRES_IN");

  // JWT secret strength. A weak, placeholder, or reused secret means tokens
  // can be forged offline → full account takeover, so a self-hoster who
  // hand-edits .env with "changeme" must not be able to boot in production.
  // `make generate-secrets` emits 80-char (openssl rand -hex 40) values, so
  // the 32-char floor never rejects the project's own tooling.
  validateJwtSecretStrength();

  // SSL
  requireConfig(config.ssl.certPath, "SSL_CERT_PATH");
  requireConfig(config.ssl.keyPath, "SSL_KEY_PATH");

  // File uploads
  requireConfig(config.uploads.dir, "UPLOAD_DIR");
};

const MIN_SECRET_LENGTH = 32;
// Obvious placeholders that must never survive into a running instance.
const WEAK_SECRETS = new Set([
  "secret", "changeme", "change-me", "password", "jwtsecret", "jwt_secret",
  "your-secret", "your_secret_here", "supersecret", "test", "dev", "default",
]);

const validateJwtSecretStrength = () => {
  // Presence is already enforced above. Strength is only hard-enforced in
  // production; in dev/test we warn so local placeholder secrets keep working.
  const enforce = config.envIsProd;
  const secrets = {
    JWT_SECRET: config.jwt.secret,
    JWT_REFRESH_SECRET: config.jwt.refreshSecret,
    JWT_PUBLIC_API_SECRET: config.jwt.publicApiSecret,
  };

  const problems = [];
  for (const [name, value] of Object.entries(secrets)) {
    if (String(value).length < MIN_SECRET_LENGTH) {
      problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters (run \`make generate-secrets\`)`);
    }
    if (WEAK_SECRETS.has(String(value).trim().toLowerCase())) {
      problems.push(`${name} is a known placeholder value — set a random secret`);
    }
  }

  // Reusing one secret across the three token types means a leaked/forgeable
  // access token also validates as a refresh or public-API token.
  const values = Object.values(secrets).map(String);
  if (new Set(values).size !== values.length) {
    problems.push("JWT_SECRET, JWT_REFRESH_SECRET and JWT_PUBLIC_API_SECRET must all be different");
  }

  if (problems.length === 0) return;

  const message = `Insecure JWT configuration:\n  - ${problems.join("\n  - ")}`;
  if (enforce) throw new Error(message);
  console.warn(`[config] WARNING — ${message}`);
};

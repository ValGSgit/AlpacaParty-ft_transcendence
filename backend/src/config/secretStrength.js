/**
 * JWT secret strength checks.
 *
 * Kept free of any `config` import so it is trivially unit-testable and has no
 * side effects. `validateConfig.js` wires the results to the loaded config and
 * decides whether to throw (production) or warn (dev/test).
 */

export const MIN_SECRET_LENGTH = 32;

// Obvious placeholders that must never survive into a running instance.
export const WEAK_SECRETS = new Set([
  "secret", "changeme", "change-me", "password", "jwtsecret", "jwt_secret",
  "your-secret", "your_secret_here", "supersecret", "test", "dev", "default",
]);

/**
 * Return an array of human-readable problems with the given JWT secret triple.
 * Empty array ⇒ the secrets are acceptably strong and distinct.
 *
 * @param {{JWT_SECRET: string, JWT_REFRESH_SECRET: string, JWT_PUBLIC_API_SECRET: string}} secrets
 * @returns {string[]}
 */
export const jwtSecretProblems = (secrets) => {
  const problems = [];

  for (const [name, value] of Object.entries(secrets)) {
    const str = String(value ?? "");
    if (str.length < MIN_SECRET_LENGTH) {
      problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters (run \`make generate-secrets\`)`);
    }
    if (WEAK_SECRETS.has(str.trim().toLowerCase())) {
      problems.push(`${name} is a known placeholder value — set a random secret`);
    }
  }

  // Reusing one secret across the three token types means a leaked/forgeable
  // access token also validates as a refresh or public-API token.
  const values = Object.values(secrets).map((v) => String(v ?? ""));
  if (new Set(values).size !== values.length) {
    problems.push("JWT_SECRET, JWT_REFRESH_SECRET and JWT_PUBLIC_API_SECRET must all be different");
  }

  return problems;
};

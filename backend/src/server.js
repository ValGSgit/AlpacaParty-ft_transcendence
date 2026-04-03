/**
 * Bootstrap entry point
 *
 * Loads Vault secrets into process.env BEFORE config/index.js evaluates,
 * then starts the Express app via dynamic import.
 *
 * Top-level await is supported in Node 18+ ESM modules.
 */
import dotenv from "dotenv";
import { loadVaultSecrets } from "./config/vault.js";

dotenv.config({ path: "/run/secrets/.env" });

// Load secrets from Vault into process.env BEFORE config/index.js evaluates.
// Migrations are handled by docker-entrypoint.sh (dev) and the database init (prod).
await loadVaultSecrets();

await import("./index.js");

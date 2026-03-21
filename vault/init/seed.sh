#!/bin/sh
# vault/init/seed.sh — Idempotent secret seeder for dev Vault.
# Runs inside the vault container after the server starts.
# All secrets are sourced from environment variables already present
# in the container (passed through docker-compose).
#
# In production, run this manually after vault operator init + unseal:
#   docker exec alpacaparty_vault_prod sh /vault/init/seed.sh

set -e

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-${VAULT_DEV_ROOT_TOKEN_ID:-alpacaparty-dev-token}}"
export VAULT_ADDR VAULT_TOKEN

echo "[vault-seed] Waiting for Vault to be ready..."
until vault status >/dev/null 2>&1; do sleep 1; done

# Enable KV v2 secrets engine only when not already mounted.
# Avoids noisy server-side "path is already in use" errors in logs.
if vault secrets list | grep -q '^secret/'; then
  echo "[vault-seed] KV mount secret/ already exists; skipping enable"
else
  vault secrets enable -path=secret kv-v2
fi

echo "[vault-seed] Writing AlpacaParty secrets to secret/alpacaparty ..."
vault kv put secret/alpacaparty \
  db_password="${DB_PASSWORD:-alpacaparty}" \
  db_user="${DB_USER:-alpacaparty}" \
  db_name="${DB_NAME:-alpacaparty}" \
  jwt_secret="${JWT_SECRET:-dev-secret-change-me}" \
  api_keys="${API_KEYS:-test-api-key}" \
  groq_api_key="${GROQ_API_KEY:-}" \
  huggingface_api_key="${HUGGINGFACE_API_KEY:-}" \
  google_client_id="${GOOGLE_CLIENT_ID:-}" \
  google_client_secret="${GOOGLE_CLIENT_SECRET:-}" \
  github_client_id="${GITHUB_CLIENT_ID:-}" \
  github_client_secret="${GITHUB_CLIENT_SECRET:-}"

echo "[vault-seed] Done. Secrets written to secret/alpacaparty"

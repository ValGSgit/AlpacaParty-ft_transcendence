#!/bin/sh
# vault/init/seed.sh — Idempotent secret seeder.
# Runs inside the vault-init container on first deployment.
# Secrets are passed in via environment variables (from .env → compose.prod.yaml).
#
# After this runs once, the .env secrets are no longer needed by any running
# container — the backend reads everything from Vault at startup.
#
# To re-seed after adding new secrets:
#   docker compose -f compose.prod.yaml run --rm vault-init

set -e

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-${VAULT_DEV_ROOT_TOKEN_ID:-alpacaparty-dev-token}}"
export VAULT_ADDR VAULT_TOKEN

# In production (no VAULT_DEV_ROOT_TOKEN_ID), require real secrets.
# In dev, the vault container doesn't receive secrets — they come via .env to the backend directly.
IS_DEV="${VAULT_DEV_ROOT_TOKEN_ID:-}"
if [ -z "$IS_DEV" ]; then
  if [ -z "${DB_PASSWORD:-}" ]; then
    echo "[vault-seed] ERROR: DB_PASSWORD must be set before seeding" >&2; exit 1
  fi
  if [ -z "${JWT_SECRET:-}" ]; then
    echo "[vault-seed] ERROR: JWT_SECRET must be set before seeding" >&2; exit 1
  fi
fi

echo "[vault-seed] Waiting for Vault to be ready..."
until vault status >/dev/null 2>&1; do sleep 1; done

# Enable KV v2 only when not already mounted (idempotent).
if vault secrets list | grep -q '^secret/'; then
  echo "[vault-seed] KV mount secret/ already exists — skipping enable"
else
  vault secrets enable -path=secret kv-v2
fi

echo "[vault-seed] Writing secrets to secret/alpacaparty ..."
vault kv put secret/alpacaparty \
  db_user="${DB_USER:-alpacaparty}" \
  db_password="${DB_PASSWORD:-alpacaparty}" \
  db_name="${DB_NAME:-alpacaparty}" \
  jwt_secret="${JWT_SECRET:-dev-secret-change-me}" \
  api_keys="${API_KEYS:-change-me-to-a-secure-key}" \
  groq_api_key="${GROQ_API_KEY:-}" \
  huggingface_api_key="${HUGGINGFACE_API_KEY:-}" \
  google_client_id="${GOOGLE_CLIENT_ID:-}" \
  google_client_secret="${GOOGLE_CLIENT_SECRET:-}" \
  github_client_id="${GITHUB_CLIENT_ID:-}" \
  github_client_secret="${GITHUB_CLIENT_SECRET:-}"

echo "[vault-seed] Secrets written."

# ── Limited read-only policy for the backend service token ───────────────────
if vault policy list | grep -q '^alpacaparty-backend$'; then
  echo "[vault-seed] Policy 'alpacaparty-backend' already exists — skipping"
else
  echo "[vault-seed] Creating read-only policy for backend..."
  vault policy write alpacaparty-backend - <<'POLICY'
# Backend service: read the single app secret path only.
path "secret/data/alpacaparty" {
  capabilities = ["read"]
}
POLICY
  echo "[vault-seed] Policy created."
fi

# ── Create a limited backend service token ────────────────────────────────────
# In dev mode (VAULT_DEV_ROOT_TOKEN_ID is set) the root token is fine.
# In production the root token must NOT be used by the backend.
if [ -z "${VAULT_DEV_ROOT_TOKEN_ID:-}" ]; then
  echo "[vault-seed] Creating limited backend service token (90-day TTL, renewable)..."
  BACKEND_TOKEN=$(vault token create \
    -policy=alpacaparty-backend \
    -ttl=2160h \
    -renewable=true \
    -display-name=alpacaparty-backend \
    -format=json \
    | grep '"client_token"' \
    | sed 's/.*"client_token": "\(.*\)".*/\1/')

  echo ""
  echo "================================================================"
  echo "  BACKEND SERVICE TOKEN"
  echo "  Set this as VAULT_TOKEN in your .env, then restart the backend."
  echo "  This token can ONLY read secret/data/alpacaparty."
  echo ""
  echo "  ${BACKEND_TOKEN}"
  echo ""
  echo "  Renew before expiry:  vault token renew ${BACKEND_TOKEN}"
  echo "================================================================"
  echo ""
fi

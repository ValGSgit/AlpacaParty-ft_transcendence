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

# In prod VAULT_ADDR is set to https://vault:8200 by compose env.
# The http fallback is only used by the dev vault container (dev mode, no TLS).
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
  if [ -z "${JWT_REFRESH_SECRET:-}" ]; then
    echo "[vault-seed] ERROR: JWT_REFRESH_SECRET must be set before seeding" >&2; exit 1
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
  db_password="${DB_PASSWORD}" \
  db_name="${DB_NAME:-alpacaparty}" \
  jwt_secret="${JWT_SECRET}" \
  jwt_refresh_secret="${JWT_REFRESH_SECRET}" \
  api_keys="${API_KEYS:-change-me-to-a-secure-key}" \
  google_client_id="${GOOGLE_CLIENT_ID:-}" \
  google_client_secret="${GOOGLE_CLIENT_SECRET:-}" \
  github_client_id="${GITHUB_CLIENT_ID:-}" \
  github_client_secret="${GITHUB_CLIENT_SECRET:-}" \
  mod_users="${MOD_USERS:-live_admin}"

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

# ── Write-capable policy for admin/mod management (make-admin, seed-admins) ──
if vault policy list | grep -q '^alpacaparty-admin$'; then
  echo "[vault-seed] Policy 'alpacaparty-admin' already exists — skipping"
else
  echo "[vault-seed] Creating admin management policy..."
  vault policy write alpacaparty-admin - <<'POLICY'
# Admin management: read + update the single app secret path (for mod_users).
path "secret/data/alpacaparty" {
  capabilities = ["read", "create", "update"]
}
POLICY
  echo "[vault-seed] Admin policy created."
fi

# Token creation is handled by init-unseal-seed.sh, which writes the token to
# the vault_keys Docker volume (chmod 600).  Never print tokens to stdout —
# they end up in docker logs and are effectively public.

#!/bin/sh
# vault/init/seed.sh — Push app secrets to the dev-mode Vault.
# Runs once at startup; idempotent (`vault kv put` overwrites).
set -e

echo "[vault-seed] Waiting for Vault..."
until vault status >/dev/null 2>&1; do sleep 1; done

echo "[vault-seed] Writing secrets to secret/alpacaparty ..."
vault kv put secret/alpacaparty \
  db_user="${DB_USER}" \
  db_password="${DB_PASSWORD}" \
  db_name="${DB_NAME}" \
  jwt_secret="${JWT_SECRET}" \
  jwt_refresh_secret="${JWT_REFRESH_SECRET}" \
  jwt_public_api_secret="${JWT_PUBLIC_API_SECRET}" \
  jwt_admin_secret="${JWT_ADMIN_SECRET}" \
  api_keys="${API_KEYS}" \
  groq_api_key1="${GROQ_API_KEY1:-}" \
  groq_api_key2="${GROQ_API_KEY2:-}" \
  groq_api_key3="${GROQ_API_KEY3:-}" \
  groq_model="${GROQ_MODEL:-}" \
  seed_admin_password="${SEED_ADMIN_PASSWORD:-AdminPassword123}" \
  seed_demo_password="${SEED_DEMO_PASSWORD:-LiveSeed123!}"

echo "[vault-seed] Done."

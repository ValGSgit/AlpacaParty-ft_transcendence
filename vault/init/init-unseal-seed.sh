#!/bin/sh
# vault/init/init-unseal-seed.sh
# Fully-automated production Vault bootstrap.
#
# Persists the unseal key and backend service token to a shared Docker volume
# (/vault/keys/keys.env) so no manual .env editing is ever required:
#
#   First boot  → initializes Vault, unseals, seeds secrets, creates service token,
#                 writes VAULT_UNSEAL_KEY + VAULT_TOKEN to the volume
#   Reboots     → reads unseal key from volume, unseals only — reuses existing token
#   Backend     → reads VAULT_TOKEN from the same volume via vault.js fallback

set -e

# Parse a JSON string field without requiring jq.
# vault outputs pretty-printed JSON so we flatten it first.
# Usage: json_field <key> <json_string>
json_field() {
  printf '%s' "$2" | tr -d ' \n\t\r' | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

VAULT_ADDR="${VAULT_ADDR:-https://vault:8200}"
export VAULT_ADDR
export VAULT_SKIP_VERIFY=true

KEYS_FILE=/vault/keys/keys.env

# Load persisted keys from the shared volume if present
if [ -f "$KEYS_FILE" ]; then
  # shellcheck disable=SC1090
  . "$KEYS_FILE"
fi

# ── Wait for Vault process to respond ────────────────────────────────────────
echo "[vault-init] Waiting for Vault to respond..."
until wget --no-check-certificate -q --spider \
  "${VAULT_ADDR}/v1/sys/health?sealedcode=200&uninitcode=200&standbyok=true" 2>/dev/null; do
  sleep 2
done
echo "[vault-init] Vault is responding."

# ── Check initialization state ───────────────────────────────────────────────
INIT_STATUS=$(wget --no-check-certificate -q -O- "${VAULT_ADDR}/v1/sys/init" 2>/dev/null || echo '{}')
IS_INITIALIZED=$(echo "$INIT_STATUS" | grep -c '"initialized":true' || true)

if [ "$IS_INITIALIZED" = "0" ]; then
  # ── FIRST BOOT: initialize, unseal, seed, create service token ───────────
  echo "[vault-init] Vault not initialized. Running first-boot init..."

  INIT_JSON=$(vault operator init -key-shares=1 -key-threshold=1 -format=json)
  # Flatten before parsing — vault emits pretty-printed JSON (multi-line)
  _INIT_FLAT=$(printf '%s' "$INIT_JSON" | tr -d ' \n\t\r')
  VAULT_UNSEAL_KEY=$(printf '%s' "$_INIT_FLAT" | grep -o '"unseal_keys_b64":\["[^"]*"' | grep -o '[^"\[]*"$' | tr -d '"')
  ROOT_TOKEN=$(json_field root_token "$INIT_JSON")

  export VAULT_UNSEAL_KEY ROOT_TOKEN

  vault operator unseal "${VAULT_UNSEAL_KEY}"
  export VAULT_TOKEN="${ROOT_TOKEN}"

  echo "[vault-init] Vault initialized and unsealed."

  # Wait until Vault reports unsealed
  echo "[vault-init] Waiting for Vault to be active..."
  until vault status 2>/dev/null | grep -q 'Sealed.*false'; do
    sleep 1
  done
  echo "[vault-init] Vault is unsealed and active."

  # Seed secrets (requires root/admin token — only safe on first boot)
  sh /vault/init/seed.sh

  # Create limited backend service token (requires root token)
  echo "[vault-init] Creating limited backend service token..."
  SERVICE_TOKEN=$(vault token create \
    -policy=alpacaparty-backend \
    -ttl=2160h \
    -renewable=true \
    -display-name=alpacaparty-backend \
    -format=json \
    | tr -d ' \n\t\r' \
    | grep -o '"client_token":"[^"]*"' \
    | cut -d'"' -f4)

  # Persist keys to the shared volume
  # The backend reads VAULT_TOKEN from this file via vault.js (NODE_VAULT_KEYS_FILE).
  # The unseal key is read by this script on subsequent reboots.
  mkdir -p "$(dirname "$KEYS_FILE")"
  cat > "$KEYS_FILE" <<EOF
VAULT_UNSEAL_KEY=${VAULT_UNSEAL_KEY}
VAULT_TOKEN=${SERVICE_TOKEN}
EOF
  # 644: world-readable within Docker. The vault_keys volume is only mounted by
  # vault-init (write) and backend (read). chmod is safe regardless of which user
  # the script ultimately runs as (vault or root).
  chmod 644 "$KEYS_FILE"

  echo "[vault-init] Keys saved to ${KEYS_FILE}. Backend will read token from there."

else
  # ── SUBSEQUENT BOOTS: unseal only, reuse existing service token ───────────
  echo "[vault-init] Vault already initialized. Unsealing..."

  if [ -z "${VAULT_UNSEAL_KEY:-}" ]; then
    echo "[vault-init] ERROR: VAULT_UNSEAL_KEY not found in ${KEYS_FILE} or environment." >&2
    echo "[vault-init]        The vault_keys Docker volume may have been deleted." >&2
    echo "[vault-init]        Restore it from backup or destroy vault_data and reinitialize." >&2
    exit 1
  fi

  vault operator unseal "${VAULT_UNSEAL_KEY}"

  # Wait until Vault reports unsealed
  echo "[vault-init] Waiting for Vault to be active..."
  until vault status 2>/dev/null | grep -q 'Sealed.*false'; do
    sleep 1
  done
  echo "[vault-init] Vault is unsealed and active."

  echo "[vault-init] Reusing existing service token from ${KEYS_FILE}."

fi

echo "[vault-init] Bootstrap complete."

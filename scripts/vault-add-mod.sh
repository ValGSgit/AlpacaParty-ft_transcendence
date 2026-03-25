#!/bin/sh
# Add $MOD_USERNAME to the mod_users list in Vault.
# Requires: VAULT_ADDR, VAULT_TOKEN (write-capable), MOD_USERNAME env vars.
set -e

if [ -z "$MOD_USERNAME" ]; then
  echo "[vault-mod] ERROR: MOD_USERNAME env var is required" >&2
  exit 1
fi

cur=$(vault kv get -field=mod_users secret/alpacaparty 2>/dev/null || echo "")

# Idempotent — skip if already present
case ",$cur," in
  *,"$MOD_USERNAME",*)
    echo "[vault-mod] '$MOD_USERNAME' is already in mod_users"
    exit 0
    ;;
esac

new=$([ -z "$cur" ] && echo "$MOD_USERNAME" || echo "$cur,$MOD_USERNAME")
vault kv patch secret/alpacaparty mod_users="$new"
echo "[vault-mod] '$MOD_USERNAME' added to mod_users"

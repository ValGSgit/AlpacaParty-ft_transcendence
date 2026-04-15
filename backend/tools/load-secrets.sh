#!/bin/sh
set -e

# 1. Load the token from the shared volume
KEYS_FILE="/run/vault-keys/keys.env"

if [ -f "$KEYS_FILE" ]; then
  echo "Loading Vault token from shared volume..."
  # This sets VAULT_TOKEN to the SERVICE_TOKEN created by vault-init
  . "$KEYS_FILE"
  export VAULT_TOKEN
else
  echo "ERROR: Vault keys file not found at $KEYS_FILE"
  echo "Ensure vault-init has completed successfully."
  exit 1
fi


# Load secrets from vault and prepare the environment
# We run the node script to create /run/secrets/.env
node ./src/tools/fetchSecrets.js

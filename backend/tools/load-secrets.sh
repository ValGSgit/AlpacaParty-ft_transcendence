#!/bin/sh
# Fetch all app secrets from Vault into /run/secrets/.env using VAULT_TOKEN
# (set via compose env, no shared volume needed).
set -e

if [ -z "$VAULT_TOKEN" ]; then
  echo "ERROR: VAULT_TOKEN env var is not set" >&2
  exit 1
fi

node ./src/tools/fetchSecrets.js

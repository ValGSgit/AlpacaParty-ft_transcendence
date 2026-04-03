#!/bin/sh

set -e

# install env-cmd globaly
npm install -g env-cmd

# Builds the /run/secrets/.env file
/usr/local/bin/load-secrets.sh

# Helper variable
run_with_secrets="env-cmd -f /run/secrets/.env"

# Seed database
$run_with_secrets npx prisma db seed --config prisma.config.js

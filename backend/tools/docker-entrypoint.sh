#!/bin/sh

set -e

# Install dependencies (always use npm install — npm ci requires exact lock file sync)
npm install --ignore-scripts

# Sync database schema (idempotent — works whether DB is empty or pre-initialized by init.sql)
echo "Syncing database schema..."
npx prisma db push --accept-data-loss

# Generate the client
npx prisma generate

exec "$@"

#!/bin/sh

set -e

# Install dependencies (always use npm install — npm ci requires exact lock file sync)
# (prev version) npm install --ignore-scripts

# Sync database schema (idempotent — works whether DB is empty or pre-initialized by init.sql)
# (prev)echo "Syncing database schema..."
# (prev)npx prisma db push --accept-data-loss

set -e

# Creates package lock if it does not exist
if [ ! -f "package-lock.json" ]; then
  echo run npm install
  npm install --ignore-scripts
else 
  echo package-lock.json exists
  npm clean-install --ignore-scripts
fi

# Create migration files from schema if none exist, then apply all pending migrations.
# migrate dev generates the initial migration on first run (creates the folder),
# then on subsequent runs it's a no-op when schema is in sync.
echo "Applying database migrations..."
npx prisma migrate dev --name init

# Regenerate client in case node_modules was freshly volume-mounted.
npx prisma generate

exec "$@"

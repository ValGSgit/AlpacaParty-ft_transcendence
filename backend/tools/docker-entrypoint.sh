#!/bin/sh

set -e

# Install dependencies (always use npm install — npm ci requires exact lock file sync)
npm install --ignore-scripts

# Apply migrations
if [ -d "prisma/migrations" ]; then
  echo "Deploying migrations..."
  npx prisma migrate deploy
else
  echo "No migration files found — pushing schema directly..."
  npx prisma db push --accept-data-loss
fi

# Generate the client
npx prisma generate

exec "$@"

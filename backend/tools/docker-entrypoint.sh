#!/bin/sh
set -e

# Apply database migrations. `migrate deploy` only runs committed migrations;
# if none exist (first deploy with a fresh schema), fall back to `db push`.
if find prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  echo "Deploying database migrations"
  npx prisma migrate deploy
else
  echo "No committed migrations — pushing schema"
  npx prisma db push --accept-data-loss
fi

echo "Generating Prisma client"
npx prisma generate

echo "Seeding database"
npm run seed

exec "$@"

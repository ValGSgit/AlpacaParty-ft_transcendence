#!/bin/sh
set -e

# Apply database migrations. `migrate deploy` only runs committed migrations;
# if none exist they will be created
if find prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  echo "Deploying database migrations"
  npx prisma migrate deploy
else
  echo "No migrations found"
  npx prisma migrate dev --name init
fi

echo "Generating Prisma client"
npx prisma generate

echo "Seeding database"
npm run seed

exec "$@"

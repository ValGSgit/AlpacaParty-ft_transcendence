#!/bin/sh
set -e

# Install deps (cheap when node_modules is already populated).
npm install

prisma="./node_modules/.bin/prisma"

echo "Applying database migrations"
$prisma migrate dev --name init

echo "Generating Prisma client"
$prisma generate

echo "Seeding database"
npm run seed

echo "Building API docs"
rm -f /app/src/docs/swagger-output-public-api.json
npm run buildDocs

exec "$@"

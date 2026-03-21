#!/bin/sh

set -e

# Creates package lock if it does not exist
if [ ! -f "package-lock.json" ]; then
  echo run npm install
  npm install --ignore-scripts
else 
  echo package-lock.json exists
  npm clean-install --ignore-scripts
fi

# Check if migration folder exists
if [ -d "prisma/migrations" ]; then
  echo "Migrations exist"
  npx prisma migrate dev --url $DATABASE_URL --name init
else
  echo "No migrations available"

  # Reset database and apply all migrations (all data will be lost)
  echo "Reset migrations"
  npx prisma migrate reset --force --config prisma.config.js

  # Create sql migration file
  echo "Running Prisma migrate"
  npx prisma migrate dev --url $DATABASE_URL --name init
fi

# Generate the client
npx prisma generate

exec "$@"

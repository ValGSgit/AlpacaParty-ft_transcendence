#!/bin/sh
set -e

# Creates package lock if it does not exist
echo "run npm install"
npm install

# Builds the /run/secrets/.env file
/usr/local/bin/load-secrets.sh

# Use local binaries directly — avoids npx re-downloading packages
# when the npm 11 lookup misses local node_modules/.bin.
run_with_secrets="./node_modules/.bin/env-cmd -f /run/secrets/.env"
prisma="./node_modules/.bin/prisma"

echo "Applying database migrations"
$run_with_secrets $prisma migrate dev --name init

echo "Create prisma client"
$run_with_secrets $prisma generate

echo "Seed database"
$run_with_secrets npm run seed

exec "$@"

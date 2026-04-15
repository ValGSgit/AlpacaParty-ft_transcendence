#!/bin/sh
set -e

# Creates package lock if it does not exist
echo "run npm install"
npm install

# Builds the /run/secrets/.env file
/usr/local/bin/load-secrets.sh

# Helper variable
run_with_secrets="npx env-cmd -f /run/secrets/.env"

echo "Applying database migrations..."
$run_with_secrets npx prisma migrate dev --name init

echo "Create prisma client"
$run_with_secrets npx prisma generate

echo "Seed database"
$run_with_secrets npm run seed

exec "$@"

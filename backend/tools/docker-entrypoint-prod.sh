#!/bin/sh
set -e

# Builds the /run/secrets/.env file
/usr/local/bin/load-secrets.sh

# Helper variable
run_with_secrets="npx env-cmd -f /run/secrets/.env"

echo "Deploy database migrations..."
$run_with_secrets npx prisma migrate deploy

echo "Create prisma client"
$run_with_secrets npx prisma generate

echo "Seed database"
$run_with_secrets npm run seed

exec "$@"

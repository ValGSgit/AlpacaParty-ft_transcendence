#!/bin/sh
set -e

# Load the Vault-sourced environment file and make the variables available to
# Prisma and the application process.
/usr/local/bin/load-secrets.sh
set -a
. /run/secrets/.env
set +a

echo "Applying production database migrations..."
npx prisma migrate deploy

echo "Ensuring database schema is in sync with Prisma schema..."
npx prisma db push

exec "$@"
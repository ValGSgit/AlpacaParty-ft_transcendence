#!/bin/sh
set -e

# Builds the /run/secrets/.env file
/usr/local/bin/load-secrets.sh

# Helper variable
run_with_secrets="npx env-cmd -f /run/secrets/.env"

if find prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
	echo "Deploy database migrations..."
	$run_with_secrets npx prisma migrate deploy
else
	echo "No migration folders found, syncing schema with prisma db push..."
	$run_with_secrets npx prisma db push
fi

echo "Create prisma client"
$run_with_secrets npx prisma generate

echo "Seed database"
$run_with_secrets npm run seed

exec "$@"

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
if find prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
	# Apply committed migrations only; do not generate new files at container boot.
	$run_with_secrets npx prisma migrate deploy
else
	echo "No migration folders found, creating initial migration..."
	$run_with_secrets npx prisma migrate dev --name init
fi

echo "Create prisma client"
$run_with_secrets npx prisma generate

echo "Seed database"
$run_with_secrets npm run seed

exec "$@"

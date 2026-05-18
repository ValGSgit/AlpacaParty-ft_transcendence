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
	# No committed migration directories — push schema directly.
	# prisma migrate dev is blocked in NODE_ENV=production; db push is the
	# production-safe equivalent for initial schema creation.
	echo "No migration folders found, pushing schema..."
	$run_with_secrets npx prisma db push --accept-data-loss
fi

echo "Create prisma client"
$run_with_secrets npx prisma generate

echo "Seed database"
$run_with_secrets npm run seed

# Run the main app with secrets available in the environment.
$run_with_secrets "$@"

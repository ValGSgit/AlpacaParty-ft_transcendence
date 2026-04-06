#!/bin/sh
set -e

# Creates package lock if it does not exist
if [ ! -f "package-lock.json" ]; then
  echo "run npm install"
  npm install --ignore-scripts
else 
  echo "package-lock.json exists"
  npm clean-install --ignore-scripts
fi

# install env-cmd globaly
npm install -g env-cmd

# Builds the /run/secrets/.env file
/usr/local/bin/load-secrets.sh

# Helper variable
run_with_secrets="env-cmd -f /run/secrets/.env"

if find prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  echo "Deploy database migrations..."
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

#!/bin/sh

run_with_secrets="./node_modules/.bin/env-cmd -f /run/secrets/.env"

$run_with_secrets sh -c 'npx prisma studio --port 5555 --url "$DATABASE_URL" --browser none'
http://localhost:5555/
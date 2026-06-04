#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
printf 'Running aggressive Docker cleanup (global).\n'
docker compose down --rmi all --volumes --remove-orphans || true
docker system prune -af --volumes
docker builder prune -af

docker run --rm -v "$(pwd):/workdir" -w /workdir alpine rm -rf backend/uploads backend/prisma/migrations

printf 'Aggressive Docker cleanup complete\n'

#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
printf 'Running aggressive Docker cleanup (global).\n'
docker compose down --rmi all --volumes --remove-orphans || true
docker system prune -af --volumes
docker builder prune -af
rm -rf backend/node_modules frontend/node_modules
printf 'Aggressive Docker cleanup complete\n'

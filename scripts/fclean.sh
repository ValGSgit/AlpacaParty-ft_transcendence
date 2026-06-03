#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker compose down --rmi all --volumes --remove-orphans
docker volume prune -f >/dev/null 2>&1 || true
rm -rf backend/node_modules frontend/node_modules
printf 'Full cleanup complete\n'

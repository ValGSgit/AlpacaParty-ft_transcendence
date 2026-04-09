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

exec "$@"

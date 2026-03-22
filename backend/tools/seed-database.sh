#!/bin/sh

set -e

# Seed database
npx prisma db seed --config prisma.config.js

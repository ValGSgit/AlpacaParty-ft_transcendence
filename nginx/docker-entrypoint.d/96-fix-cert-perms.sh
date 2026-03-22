#!/bin/sh
# Normalize TLS cert permissions so nginx can always read them.
set -eu

CRT="/etc/nginx/conf/server.crt"
KEY="/etc/nginx/conf/server.key"

if [ -f "$CRT" ] && [ -w "$CRT" ] && [ -O "$CRT" ]; then
  chmod 644 "$CRT" || true
fi

if [ -f "$KEY" ] && [ -w "$KEY" ] && [ -O "$KEY" ]; then
  # Private key stays owner-writable, but readable by other users in container.
  chmod 644 "$KEY" || true
fi

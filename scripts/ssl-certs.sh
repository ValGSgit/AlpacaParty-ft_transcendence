#!/bin/sh
# Generate self-signed SSL certificates for AlpacaParty.
# Run from repo root: bash scripts/ssl-certs.sh
# Works on Linux, macOS, Git Bash (Windows), and CI.
set -e

CERT=ssl/cert.pem
KEY=ssl/key.pem

mkdir -p ssl

# Remove any Docker-created placeholder directories at these paths.
for f in "$CERT" "$KEY"; do
  if [ -d "$f" ]; then
    echo "  Removing placeholder directory: $f"
    rm -rf "$f"
  fi
done

# Validate any existing cert. If openssl can't parse it (e.g. from a partial
# failed previous run), delete it and regenerate rather than leaving vault broken.
if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  if openssl x509 -in "$CERT" -noout 2>/dev/null; then
    echo "  SSL certificate already exists and is valid — skipping"
    exit 0
  else
    echo "  Existing cert is invalid — removing and regenerating"
    rm -f "$CERT" "$KEY"
  fi
fi

echo "  Generating self-signed SSL certificate..."
# MSYS_NO_PATHCONV=1 prevents Git Bash from converting /CN=localhost
# into a Windows path (C:/Program Files/Git/CN=localhost).
# Harmless on Linux/macOS/CI where MSYS is not present.
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$KEY" \
  -out    "$CERT" \
  -days   365 \
  -subj   '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,DNS:vault,DNS:backend,DNS:nginx,IP:127.0.0.1'

# Make certs readable by Docker containers that drop privileges (e.g. vault uid 100).
chmod 644 "$CERT" "$KEY"

echo "SSL certificate generated in ssl/"

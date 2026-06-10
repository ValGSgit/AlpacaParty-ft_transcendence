#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=./lib.sh
source "$SCRIPT_DIR/lib.sh"

root=$(cd "$SCRIPT_DIR/.." && pwd)
mkdir -p "$root/ssl"

if [[ ! -f "$root/ssl/cert.pem" ]]; then
  echo "Create ssl-certs" 
	ip=$(detect_ip)
	if [[ -z "$ip" ]]; then
		echo 'Error: Could not detect IP address.'
		exit 1
	fi

	echo "Generating certificate for IP: $ip"
	san="DNS:localhost,DNS:frontend,DNS:backend,DNS:nginx,IP:127.0.0.1,IP:$ip,DNS:$ip.nip.io"
	if openssl req -help 2>&1 | grep -q -- '-addext'; then
		openssl req -x509 -newkey rsa:2048 -nodes \
			-keyout "$root/ssl/key.pem" -out "$root/ssl/cert.pem" -days 365 \
			-subj '/CN=localhost' \
			-addext "subjectAltName=$san"
	else
		tmp_conf=$(mktemp /tmp/ssl-conf.XXXXXX)
		trap 'rm -f "$tmp_conf"' EXIT
		cat > "$tmp_conf" <<EOF
[req]
distinguished_name = req_distinguished_name
prompt = no
x509_extensions = v3_req

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = $san
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
EOF
		openssl req -x509 -newkey rsa:2048 -nodes \
			-keyout "$root/ssl/key.pem" -out "$root/ssl/cert.pem" -days 365 \
			-config "$tmp_conf" \
			-extensions v3_req
		trap - EXIT
		rm -f "$tmp_conf"
	fi
	chmod +rw "$root/ssl/key.pem" "$root/ssl/cert.pem"
	printf 'Self-signed certificate generated in ssl/\n'
else
	printf 'Certificate already exists, skipping\n'
fi

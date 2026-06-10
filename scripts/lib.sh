#!/usr/bin/env bash

set -euo pipefail

env_value() {
	local key=$1
	local file=$2
	awk -F= -v key="$key" '$1 == key { sub("^[^=]*=", ""); value = $0 } END { if (value != "") print value }' "$file"
}

sed_in_place() {
	if [[ $(uname -s) == Darwin ]]; then
		sed -i '' "$@"
	else
		sed -i "$@"
	fi
}

detect_ip() {
	if [[ $(uname -s) == Darwin ]]; then
		local mac_iface ip
		mac_iface=$(route get default 2>/dev/null | awk '/interface:/ {print $2}')
		if [[ -n "$mac_iface" ]]; then
			ip=$(ipconfig getifaddr "$mac_iface" 2>/dev/null || true)
		fi
		if [[ -z "${ip:-}" ]]; then
			ip=$(ifconfig 2>/dev/null \
				| awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')
		fi
		printf '%s' "${ip:-}"
	else
		hostname -I 2>/dev/null | awk '{print $1}'
	fi
}

ensure_env_file() {
	local root=$1
	if [[ ! -f "$root/.env" ]]; then
		cp "$root/.env.example" "$root/.env"
		printf 'Created .env from .env.example\n'
	fi
}

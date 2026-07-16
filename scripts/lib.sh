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
	local ip
	case "$(uname -s)" in
		Darwin)
			local mac_iface
			mac_iface=$(route get default 2>/dev/null | awk '/interface:/ {print $2}')
			if [[ -n "$mac_iface" ]]; then
				ip=$(ipconfig getifaddr "$mac_iface" 2>/dev/null || true)
			fi
			if [[ -z "${ip:-}" ]]; then
				ip=$(ifconfig 2>/dev/null \
					| awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')
			fi
			;;
		MINGW*|MSYS*|CYGWIN*)
			# Windows (Git Bash / MSYS). hostname -I doesn't exist here. Prefer
			# PowerShell (locale-independent); fall back to parsing ipconfig.
			ip=$(powershell.exe -NoProfile -Command '(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1 -ExpandProperty IPAddress)' 2>/dev/null | tr -d '[:space:]')
			if [[ -z "${ip:-}" ]]; then
				ip=$(ipconfig 2>/dev/null | grep -a 'IPv4' \
					| grep -aoE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -n1 | tr -d '[:space:]')
			fi
			;;
		*)
			ip=$(hostname -I 2>/dev/null | awk '{print $1}')
			;;
	esac
	printf '%s' "${ip:-}"
}

ensure_env_file() {
	local root=$1
	if [[ ! -f "$root/.env" ]]; then
		cp "$root/.env.example" "$root/.env"
		printf 'Created .env from .env.example\n'
	fi
}

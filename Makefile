
# ============================================================================
# ALPACAPARTY — Makefile
#
#   make            Build and run the whole stack (default)
#   make down       Stop everything
#   make re         Rebuild and restart
#   make logs       Tail logs
#   make info       Show the app URLs + module pointers
#   make clean      Stop + remove images
#   make fclean     Also remove volumes + node_modules
# ============================================================================

DC := docker compose

.DEFAULT_GOAL := up
.PHONY: up down re build logs ps info help \
	generate-secrets ssl-certs set-ip \
	clean fclean deep-clean

# ── Run ─────────────────────────────────────────────────────
# A single `make` builds every image and brings the stack up.
up: .env ssl-certs
	$(DC) up -d --build
	@bash scripts/info.sh

down:
	$(DC) down

re: down up

build: .env
	$(DC) build

logs:
	$(DC) logs -f

ps:
	$(DC) ps

# ── Showcase helper ─────────────────────────────────────────
info:
	@bash scripts/info.sh

help: info

# ── .env + secrets ──────────────────────────────────────────
# Auto-generate .env (with random secrets, detected IP, and ports from
# .env.example) the first time anything needs it.
.env:
	@bash scripts/generate-secrets.sh

generate-secrets:
	@bash scripts/generate-secrets.sh

# Substitute {MY_IP} and {HTTPS_PORT} placeholders in .env.
set-ip:
	@bash scripts/set-ip.sh

# ── SSL certificates ────────────────────────────────────────
ssl-certs:
	@bash scripts/ssl-certs.sh

# ── Cleanup ─────────────────────────────────────────────────
clean:
	@bash scripts/clean.sh

fclean:
	@bash scripts/fclean.sh

deep-clean:
	@bash scripts/deep-clean.sh
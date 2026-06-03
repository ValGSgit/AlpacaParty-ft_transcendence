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

GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
BOLD   := \033[1m
RESET  := \033[0m

DC := docker compose

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    SED_I := sed -i ''
else
    SED_I := sed -i
endif

.DEFAULT_GOAL := up
.PHONY: up down re build logs ps info help \
        generate-secrets ssl-certs set-ip \
        clean fclean deep-clean \

# ── Run ─────────────────────────────────────────────────────
# A single `make` builds every image and brings the stack up.
up: .env ssl-certs
	$(DC) up -d --build
	@$(MAKE) --no-print-directory info

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
	@IP=$$(grep '^FRONTEND_URL=' .env 2>/dev/null | sed -E 's#.*://([^:/]+).*#\1#'); \
	 PORT=$$(grep '^HTTPS_PORT=' .env 2>/dev/null | cut -d= -f2-); \
	 IP=$${IP:-localhost}; PORT=$${PORT:-8443}; \
	 echo ""; \
	 echo "$(CYAN)$(BOLD)========== AlpacaParty ==========$(RESET)"; \
	 echo "  $(BOLD)App$(RESET)          https://$$IP:$$PORT"; \
	 echo "  $(BOLD)API health$(RESET)   https://$$IP:$$PORT/api/health"; \
	 echo "  $(BOLD)API docs$(RESET)     https://$$IP:$$PORT/api/docs   (Swagger UI)"; \
	 echo ""; \
	 echo "  $(YELLOW)Showcase pointers$(RESET)"; \
	 echo "    • Realtime + games   open two tabs, play Spit Royale / Alpaca Road"; \
	 echo "    • Help-desk LLM      bottom-right chat widget (Groq)"; \
	 echo "    • Public API         curl -k -H 'X-API-Key: <key>' https://$$IP:$$PORT/api/public/users"; \
	 echo "    • 3D farm            'AlpacaFarm' tab (Three.js)"; \
	 echo ""; \
	 echo "  $(GREEN)make logs$(RESET)  ·  $(GREEN)make ps$(RESET)  ·  $(GREEN)make down$(RESET)  ·  $(GREEN)make re$(RESET)"; \
	 echo ""

help: info

# ── .env + secrets ──────────────────────────────────────────
# Auto-generate .env (with random secrets, detected IP, and ports from
# .env.example) the first time anything needs it.
.env:
	@echo "$(YELLOW)No .env found — generating one with random secrets…$(RESET)"
	@$(MAKE) --no-print-directory generate-secrets

generate-secrets:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env from .env.example$(RESET)"; \
	fi
	@$(MAKE) --no-print-directory set-ip
	@DB_NAME=$$(grep '^DB_NAME=' .env | cut -d= -f2-); DB_NAME=$${DB_NAME:-alpacaparty}; \
		DB_USER=$$(grep '^DB_USER=' .env | cut -d= -f2-); DB_USER=$${DB_USER:-alpacaparty}; \
		DB_PORT=$$(grep '^DB_PORT=' .env | cut -d= -f2-); DB_PORT=$${DB_PORT:-5432}; \
		DB_PASS=$$(openssl rand -hex 24); \
		$(SED_I) "s|^DB_PASSWORD=.*|DB_PASSWORD=$$DB_PASS|" .env; \
		DB_URL="postgresql://$$DB_USER:$$DB_PASS@$${DB_HOST:-postgres}:$$DB_PORT/$$DB_NAME?schema=public"; \
		if grep -q '^DATABASE_URL=' .env; then \
			$(SED_I) "s|^DATABASE_URL=.*|DATABASE_URL=$$DB_URL|" .env; \
		else \
			printf '\nDATABASE_URL=%s\n' "$$DB_URL" >> .env; \
		fi; \
		echo "$(GREEN)✓ DB_PASSWORD + DATABASE_URL randomised$(RESET)"
	@for VAR in JWT_SECRET JWT_REFRESH_SECRET JWT_PUBLIC_API_SECRET; do \
		SECRET=$$(openssl rand -hex 40); \
		$(SED_I) "s|^$$VAR=.*|$$VAR=$$SECRET|" .env; \
		echo "$(GREEN)✓ $$VAR randomised$(RESET)"; \
	done
	@API_KEY=$$(openssl rand -hex 32); \
		if grep -q '^API_KEYS=' .env; then \
			$(SED_I) "s|^API_KEYS=.*|API_KEYS=$$API_KEY|" .env; \
		else \
			printf '\nAPI_KEYS=%s\n' "$$API_KEY" >> .env; \
		fi; \
		echo "$(GREEN)✓ API_KEYS randomised$(RESET)"
	@echo "$(YELLOW)  Secrets written to .env — keep this file out of version control$(RESET)"

# Substitute {MY_IP} and {HTTPS_PORT} placeholders in .env.
set-ip:
	@OS=$$(uname -s); \
	if [ "$$OS" = "Darwin" ]; then \
		MAC_IFACE=$$(route get default | awk '/interface:/ {print $$2}'); \
		IP=$$(ipconfig getifaddr $$MAC_IFACE); \
	else \
		IP=$$(hostname -I | awk '{print $$1}'); \
	fi; \
	if [ -z "$$IP" ]; then echo "Error: Could not detect IP address."; exit 1; fi; \
	HTTPS_PORT=$$(grep '^HTTPS_PORT=' .env | cut -d= -f2-); HTTPS_PORT=$${HTTPS_PORT:-8443}; \
	$(SED_I) "s/{MY_IP}/$$IP/g" .env; \
	$(SED_I) "s/{HTTPS_PORT}/$$HTTPS_PORT/g" .env; \
	echo "$(GREEN)✓ .env updated with IP $$IP and HTTPS port $$HTTPS_PORT$(RESET)"

# ── SSL certificates ────────────────────────────────────────
ssl-certs:
	@mkdir -p ssl
	@if [ ! -f ssl/cert.pem ]; then \
		OS=$$(uname -s); \
		if [ "$$OS" = "Darwin" ]; then \
			MAC_IFACE=$$(route get default | awk '/interface:/ {print $$2}'); \
			IP=$$(ipconfig getifaddr $$MAC_IFACE); \
		else \
			IP=$$(hostname -I | awk '{print $$1}'); \
		fi; \
		if [ -z "$$IP" ]; then echo "Error: Could not detect IP address."; exit 1; fi; \
		echo "Generating certificate for IP: $$IP"; \
		openssl req -x509 -newkey rsa:2048 -nodes \
			-keyout ssl/key.pem -out ssl/cert.pem -days 365 \
			-subj '/CN=localhost' \
			-addext "subjectAltName=DNS:localhost,DNS:frontend,DNS:backend,DNS:nginx,IP:127.0.0.1,IP:$$IP,DNS:$$IP.nip.io" \
			2>/dev/null && \
		echo "$(GREEN)✓ Self-signed certificate generated in ssl/$(RESET)"; \
	else \
		echo "$(YELLOW)  Certificate already exists — skipping$(RESET)"; \
	fi
	@chmod +rw ssl/key.pem ssl/cert.pem

# ── Cleanup ─────────────────────────────────────────────────
clean:
	$(DC) down --rmi all --remove-orphans

fclean:
	$(DC) down --rmi all --volumes --remove-orphans
	@docker volume prune -f >/dev/null 2>&1 || true
	@rm -rf backend/node_modules frontend/node_modules
	@echo "$(GREEN)✓ Full cleanup complete$(RESET)"

deep-clean:
	@echo "$(YELLOW)Running aggressive Docker cleanup (global).$(RESET)"
	$(DC) down --rmi all --volumes --remove-orphans || true
	@docker system prune -af --volumes
	@docker builder prune -af
	@rm -rf backend/node_modules
	@rm -rf frontend/node_modules
	@echo "$(GREEN)✓ Aggressive Docker cleanup complete$(RESET)"
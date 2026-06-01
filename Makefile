# ============================================================================
# ALPACAPARTY — Makefile
# ============================================================================
# Layout:
#   ┌─ help / variables
#   ├─ Stack lifecycle (dev + prod)
#   ├─ Setup (secrets, ssl, dirs)
#   ├─ Shells
#   ├─ Database
#   ├─ Testing (unit + e2e + stress)
#   ├─ Vault + WAF (security ops)
#   ├─ Demo targets (one per claimed module, used during evaluation)
#   └─ Cleanup
# ============================================================================

# ── Colours ─────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
BLUE   := \033[0;34m
BOLD   := \033[1m
RESET  := \033[0m

# ── Docker ──────────────────────────────────────────────────
COMPOSE_PROJECT := alpacaparty-ft_transcendence
DC       := docker compose --profile dev
DC_TEST  := docker compose --profile test --env-file .env.test
DC_E2E   := docker compose --profile dev --profile e2e
DC_PROD  := docker compose -f compose.prod.yaml

# Detect OS (mac or linux)
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    SED_I := sed -i ''
else
    SED_I := sed -i
endif

.DEFAULT_GOAL := help
.PHONY: help \
        up down build logs restart ps \
        prod-up prod-down prod-build prod-logs prod-status \
        generate-secrets ssl-certs create-dirs set-ip \
        install install-backend install-frontend \
        dev dev-backend dev-frontend \
        shell-backend shell-frontend shell-db shell-nginx shell-vault \
        prisma_studio backend-cmd \
        test backend-test backend-test-watch e2e prod-e2e test-local \
        stress-test stress-test-build stress-test-live \
        seed-example seed-example-reset prod-seed-example prod-seed-example-reset \
        seed-live seed-live-reset prod-seed-live prod-seed-live-reset \
        seed-admin prod-seed-admin \
        vault-status vault-secrets vault-shell \
        prod-vault-status prod-vault-keys prod-vault-secrets \
        prod-vault-unseal prod-vault-reseal prod-vault-reseed prod-vault-wipe \
        waf-logs waf-test \
        demo-list demo-frameworks demo-realtime demo-user-interaction \
        demo-public-api demo-orm demo-notifications demo-uploads \
        demo-user-mgmt demo-stats demo-llm demo-waf demo-vault \
        demo-spit-royale demo-alpaca-road demo-three demo-customization demo-gamification \
        demo-admin demo-https \
        clean clean-volumes fclean deep-clean

# ── HELP ────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(CYAN)$(BOLD)========== AlpacaParty ===========$(RESET)"
	@echo ""
	@echo "$(BOLD)$(BLUE)EVALUATION DEMOS$(RESET) $(YELLOW)— one target per claimed module$(RESET)"
	@echo "  $(GREEN)make demo-list$(RESET)              Show every demo target with a one-liner"
	@echo "  $(GREEN)make demo-<name>$(RESET)            Run an individual module demo (see demo-list)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Docker — Development$(RESET)"
	@echo "  $(GREEN)make up$(RESET)              Start dev containers"
	@echo "  $(GREEN)make down$(RESET)            Stop dev containers"
	@echo "  $(GREEN)make build$(RESET)           Build / rebuild images"
	@echo "  $(GREEN)make logs$(RESET)            Tail dev logs"
	@echo "  $(GREEN)make restart$(RESET)         Restart dev containers"
	@echo "  $(GREEN)make ps$(RESET)              Show container status"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Docker — Production$(RESET)"
	@echo "  $(GREEN)make prod-up$(RESET)         Bring up the full prod stack (Vault, nginx+WAF, …)"
	@echo "  $(GREEN)make prod-down$(RESET)       Stop prod containers (keeps volumes)"
	@echo "  $(GREEN)make prod-build$(RESET)      Rebuild prod images from scratch"
	@echo "  $(GREEN)make prod-logs$(RESET)       Tail prod logs"
	@echo "  $(GREEN)make prod-status$(RESET)     One-shot health snapshot of every prod service"
	@echo "  $(GREEN)make generate-secrets$(RESET)  Rotate DB + JWT + API secrets in .env"
	@echo "  $(GREEN)make ssl-certs$(RESET)         Generate self-signed SSL cert"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Vault (security ops)$(RESET)"
	@echo "  $(GREEN)make vault-status$(RESET)             Dev Vault seal/HA status"
	@echo "  $(GREEN)make vault-secrets$(RESET)            List dev Vault KV contents"
	@echo "  $(GREEN)make vault-shell$(RESET)              Open a shell in dev Vault container"
	@echo "  $(GREEN)make prod-vault-status$(RESET)        Prod Vault seal/init status"
	@echo "  $(GREEN)make prod-vault-keys$(RESET)          Show the saved root token + unseal key"
	@echo "  $(GREEN)make prod-vault-secrets$(RESET)       Read what's stored at secret/alpacaparty"
	@echo "  $(GREEN)make prod-vault-unseal$(RESET)        Re-unseal a sealed prod Vault"
	@echo "  $(GREEN)make prod-vault-reseal$(RESET)        Seal prod Vault (security demo)"
	@echo "  $(GREEN)make prod-vault-reseed$(RESET)        Re-push secrets from .env to Vault"
	@echo "  $(GREEN)make prod-vault-wipe$(RESET)          Destroy Vault data + keys (re-init on next boot)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)WAF (ModSecurity)$(RESET)"
	@echo "  $(GREEN)make waf-logs$(RESET)        Tail ModSecurity audit log"
	@echo "  $(GREEN)make waf-test$(RESET)        Hit nginx with a known-bad payload (should 403)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Local Dev (no Docker)$(RESET)"
	@echo "  $(GREEN)make install$(RESET)         npm install in backend & frontend"
	@echo "  $(GREEN)make dev$(RESET)             Run backend + frontend locally"
	@echo "  $(GREEN)make dev-backend$(RESET)     Run backend only"
	@echo "  $(GREEN)make dev-frontend$(RESET)    Run frontend only"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Shells$(RESET)"
	@echo "  $(GREEN)make shell-backend$(RESET)   Shell into backend container"
	@echo "  $(GREEN)make shell-frontend$(RESET)  Shell into frontend container"
	@echo "  $(GREEN)make shell-db$(RESET)        psql into the database"
	@echo "  $(GREEN)make shell-nginx$(RESET)     Shell into nginx container"
	@echo "  $(GREEN)make shell-vault$(RESET)     Shell into dev Vault container"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Testing$(RESET)"
	@echo "  $(GREEN)make test$(RESET)            Backend unit tests in a container"
	@echo "  $(GREEN)make test-local$(RESET)      Backend unit tests on host node"
	@echo "  $(GREEN)make e2e$(RESET)             Playwright against dev stack"
	@echo "  $(GREEN)make prod-e2e$(RESET)        Playwright against prod stack (after seed)"
	@echo "  $(GREEN)make stress-test$(RESET)     Full stress + security stress run"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Database$(RESET)"
	@echo "  $(GREEN)make seed-live$(RESET)              Seed sample users / posts / games (dev)"
	@echo "  $(GREEN)make seed-live-reset$(RESET)        Wipe and reseed sample data (dev)"
	@echo "  $(GREEN)make prod-seed-live$(RESET)         Seed sample data (prod)"
	@echo "  $(GREEN)make prod-seed-live-reset$(RESET)   Wipe and reseed sample data (prod)"
	@echo "  $(GREEN)make seed-admin$(RESET)             Recreate the default admin user"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Cleanup$(RESET)"
	@echo "  $(GREEN)make clean$(RESET)           Stop containers + remove images"
	@echo "  $(GREEN)make clean-volumes$(RESET)   Also remove persistent volumes"
	@echo "  $(GREEN)make fclean$(RESET)          Project full cleanup + dangling prune"
	@echo "  $(GREEN)make deep-clean$(RESET)      Aggressive global Docker prune"
	@echo ""

# ── DOCKER (dev) ────────────────────────────────────────────
up: ssl-certs create-dirs
	$(DC) up -d

down:
	$(DC) down

build:
	$(DC) build

logs:
	$(DC) logs -f

restart:
	$(DC) restart

ps:
	$(DC) ps

# ── PRODUCTION ──────────────────────────────────────────────
prod-up: .env
	$(MAKE) --no-print-directory ssl-certs
	$(DC_PROD) up -d --build

prod-down:
	$(DC_PROD) down

prod-build: .env
	$(DC_PROD) build --no-cache

prod-logs:
	$(DC_PROD) logs -f

# Compact health snapshot — useful when an evaluator asks "is everything up?"
prod-status:
	@$(DC_PROD) ps --format 'table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}'

# ── SETUP ───────────────────────────────────────────────────
create-dirs:
	@mkdir -p backend/node_modules
	@mkdir -p frontend/node_modules
	@mkdir -p vault/secrets

# ── SECRETS ─────────────────────────────────────────────────
# Generates .env from .env.example with cryptographically random secrets.
# Run once before first prod deploy, or again to rotate (requires DB re-init).
generate-secrets:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env from .env.example$(RESET)"; \
	fi
	@$(MAKE) --no-print-directory set-ip
	@DB_NAME=$$(grep '^DB_NAME=' .env | cut -d= -f2-); \
		DB_NAME=$${DB_NAME:-alpacaparty}; \
		DB_USER=$$(grep '^DB_USER=' .env | cut -d= -f2-); \
		DB_USER=$${DB_USER:-alpacaparty}; \
		DB_PASS=$$(openssl rand -hex 24) && \
		$(SED_I) "s|^DB_PASSWORD=.*|DB_PASSWORD=$$DB_PASS|" .env && \
		$(SED_I) "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://$$DB_USER:$$DB_PASS@postgres:5432/$$DB_NAME?schema=public|" .env && \
		echo "$(GREEN)✓ DB_PASSWORD randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_SECRET=.*|JWT_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_REFRESH_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_PUBLIC_API_SECRET=.*|JWT_PUBLIC_API_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_PUBLIC_API_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_ADMIN_SECRET=.*|JWT_ADMIN_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_ADMIN_SECRET randomised$(RESET)"
	@API_KEY=$$(openssl rand -hex 32) && \
		if grep -q '^API_KEYS=' .env; then \
			$(SED_I) "s|^API_KEYS=.*|API_KEYS=$$API_KEY|" .env; \
		else \
			printf '\nAPI_KEYS=%s\n' "$$API_KEY" >> .env; \
		fi && \
		echo "$(GREEN)✓ API_KEYS randomised$(RESET)"
	@echo "$(GREEN)✓ DATABASE_URL synced with DB credentials$(RESET)"
	@echo "$(YELLOW)  Secrets written to .env — keep this file out of version control$(RESET)"

set-ip:
	@OS=$$(uname -s); \
	if [ "$$OS" = "Darwin" ]; then \
		MAC_IFACE=$$(route get default | awk '/interface:/ {print $$2}'); \
		IP=$$(ipconfig getifaddr $$MAC_IFACE); \
	else \
		IP=$$(hostname -I | awk '{print $$1}'); \
	fi; \
	if [ -z "$$IP" ]; then \
		echo "Error: Could not detect IP address."; \
		exit 1; \
	fi; \
	$(SED_I) "s/{MY_IP}/$$IP/g" .env; \
	echo "$(GREEN)✓ Successfully updated .env with IP: $$IP$(RESET)"

# ── SSL CERTIFICATES ────────────────────────────────────────
# Generates a self-signed certificate for local HTTPS development.
# Includes SANs so the cert is valid for inter-service TLS (vault, backend, nginx).
ssl-certs:
	@mkdir -p ssl
	@if [ ! -f ssl/cert.pem ]; then \
		echo "Detecting active local IP..."; \
		OS=$$(uname -s); \
		if [ "$$OS" = "Darwin" ]; then \
			MAC_IFACE=$$(route get default | awk '/interface:/ {print $$2}'); \
			IP=$$(ipconfig getifaddr $$MAC_IFACE); \
		else \
			IP=$$(hostname -I | awk '{print $$1}'); \
		fi; \
		if [ -z "$$IP" ]; then \
			echo "Error: Could not detect IP address."; exit 1; \
		fi; \
		echo "Generating certificate for IP: $$IP"; \
		openssl req -x509 -newkey rsa:2048 -nodes \
			-keyout ssl/key.pem \
			-out ssl/cert.pem \
			-days 365 \
			-subj '/CN=localhost' \
			-addext "subjectAltName=DNS:localhost,DNS:frontend,DNS:vault,DNS:backend,DNS:nginx,IP:127.0.0.1,IP:$$IP,DNS:$$IP.nip.io" \
			2>/dev/null && \
		echo "$(GREEN)✓ Self-signed certificate generated in ssl/$(RESET)"; \
	else \
		echo "$(YELLOW)  Certificate already exists — skipping$(RESET)"; \
	fi
	@chmod +rw ssl/key.pem
	@chmod +rw ssl/cert.pem

# Ensure .env exists with real secrets before any prod command.
# Does NOT regenerate if .env already exists (keeps DB password stable).
.env:
	@echo "$(YELLOW)No .env found — generating one with random secrets…$(RESET)"
	@$(MAKE) --no-print-directory generate-secrets

# ── LOCAL DEV ───────────────────────────────────────────────
install:
	cd backend  && npm install
	cd frontend && npm install

install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install

dev:
	@echo "Starting backend & frontend…"
	cd backend  && npm run dev & \
	cd frontend && npm run dev

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

# ── TESTING ─────────────────────────────────────────────────
# Pass extra options: make backend-test options='-- users.routes.test.js'
options ?=
backend-test: ssl-certs create-dirs
	@EXIT_CODE=0; \
	$(DC_TEST) run --rm backend_test npm test $(options) || EXIT_CODE=$$?; \
	$(DC_TEST) down -v --remove-orphans; \
	exit $$EXIT_CODE

backend-test-watch: ssl-certs create-dirs
	@EXIT_CODE=0; \
	$(DC_TEST) run --rm backend_test npm run test:watch $(options) || EXIT_CODE=$$?; \
	$(DC_TEST) down -v --remove-orphans; \
	exit $$EXIT_CODE

test: backend-test

e2e: ssl-certs create-dirs seed-live
	$(DC) up -d
	@E2E_API_KEY="$${E2E_API_KEY:-$$(grep '^API_KEYS=' .env | cut -d= -f2- | cut -d, -f1)}"; \
	$(DC_E2E) run --build --rm -e E2E_API_KEY="$$E2E_API_KEY" e2e npm test

# Production E2E: seeds data and runs Playwright against the production build.
prod-e2e: prod-seed-live
	@echo "$(CYAN)Building e2e image…$(RESET)"
	docker build -t alpacaparty-e2e e2e/
	@echo "$(CYAN)Running E2E tests against production build…$(RESET)"
	docker run --rm \
	  --network alpacaparty_net \
	  -e E2E_BASE_URL=https://nginx:443 \
	  -e E2E_API_KEY=$$(grep '^API_KEYS=' .env | cut -d= -f2- | cut -d, -f1) \
	  -e PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser \
	  alpacaparty-e2e npm test
	@echo "$(GREEN)✓ Production E2E tests complete$(RESET)"

# Run unit tests locally (no Docker)
test-local:
	cd backend && npm test

# ── STRESS & SECURITY TESTS ─────────────────────────────────
# All tools run inside Docker — no local install needed.
stress-test: ssl-certs create-dirs
	@bash scripts/run-stress-test.sh

stress-test-build: ssl-certs create-dirs
	@bash scripts/run-stress-test.sh "https://nginx:443" "10s" "1" true

stress-test-live: ssl-certs create-dirs
	@bash scripts/run-stress-test.sh "https://nginx:443" "5m" "50" false && \
	  echo "" && \
	  echo "$(GREEN)Opening latest stress-test report...$(RESET)" && \
	  tail -f $$(ls -t stress-test-results/report_*.txt 2>/dev/null | head -1) 2>/dev/null || true

# ── SHELLS ──────────────────────────────────────────────────
shell-backend:
	$(DC) exec backend sh

shell-frontend:
	$(DC) exec frontend sh

shell-db:
	$(DC) exec postgres psql -U $${DB_USER:-alpacaparty} -d $${DB_NAME:-alpacaparty}

shell-nginx:
	$(DC) exec nginx sh

shell-vault:
	$(DC) exec -e VAULT_ADDR=http://127.0.0.1:8200 \
	           -e VAULT_TOKEN=$${VAULT_TOKEN:-alpacaparty-dev-token} \
	           vault sh

prisma_studio:
	$(DC) exec -d backend /usr/local/bin/start-prisma-studio.sh

cmd ?=
backend-cmd:
	$(DC) run --rm backend $(cmd)

# ── DATABASE SEEDING ────────────────────────────────────────
seed-example:
	$(DC) up -d backend
	$(DC) exec backend npm install --no-audit --no-fund --loglevel=error
	$(DC) exec -e DATABASE_URL=$${DATABASE_URL:-postgresql://alpacaparty:alpacaparty@postgres:5432/alpacaparty} backend npx prisma generate
	$(DC) exec backend npm run seed:exampleData

seed-example-reset:
	$(DC) up -d backend
	$(DC) exec backend npm install --no-audit --no-fund --loglevel=error
	$(DC) exec -e DATABASE_URL=$${DATABASE_URL:-postgresql://alpacaparty:alpacaparty@postgres:5432/alpacaparty} backend npx prisma generate
	$(DC) exec backend npm run seed:exampleData:reset

prod-seed-example: prod-up
	$(DC_PROD) exec -e DATABASE_URL=$${DATABASE_URL:-postgresql://alpacaparty:alpacaparty@postgres:5432/alpacaparty} backend npx prisma generate
	$(DC_PROD) exec backend npm run seed:exampleData

prod-seed-example-reset:
	$(DC_PROD) up -d backend
	$(DC_PROD) exec -e DATABASE_URL=$${DATABASE_URL:-postgresql://alpacaparty:alpacaparty@postgres:5432/alpacaparty} backend npx prisma generate
	$(DC_PROD) exec backend npm run seed:exampleData:reset

# Aliases
seed-live: seed-example
seed-live-reset: seed-example-reset
prod-seed-live: prod-seed-example
prod-seed-live-reset: prod-seed-example-reset

seed-admin:
	@echo "$(CYAN)⏳ Seeding admin user...$(RESET)"
	$(DC) exec backend npm run seed

prod-seed-admin:
	@echo "$(CYAN)⏳ Seeding admin user (prod)...$(RESET)"
	$(DC_PROD) exec backend npm run seed

# ── VAULT — DEV ─────────────────────────────────────────────
vault-status:
	$(DC) exec vault vault status

vault-secrets:
	$(DC) exec vault vault kv get secret/alpacaparty

vault-shell: shell-vault

# ── VAULT — PRODUCTION ──────────────────────────────────────
# Prod Vault uses the file backend; unseal key + root token live in
# ./vault/secrets/ on the host (gitignored). See vault/init/init-and-seed.sh.

prod-vault-status:
	$(DC_PROD) exec -e VAULT_ADDR=http://127.0.0.1:8200 vault vault status

# Print the saved keys. Two-step (1: validate file exists, 2: cat) so a missing
# file produces a friendly message instead of a raw `cat` error.
prod-vault-keys:
	@if [ ! -f vault/secrets/vault-init.json ]; then \
		echo "$(YELLOW)No saved keys yet — run 'make prod-up' once to initialise.$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Root token:$(RESET)"
	@grep -o '"root_token": *"[^"]*"' vault/secrets/vault-init.json | cut -d'"' -f4
	@echo ""
	@echo "$(CYAN)Unseal key (base64):$(RESET)"
	@grep -o '"unseal_keys_b64": *\["[^"]*"' vault/secrets/vault-init.json | grep -o '"[^"]*"' | tail -1 | tr -d '"'
	@echo ""

# Read the KV payload back out — useful to prove "this is where secrets live".
prod-vault-secrets:
	@TOKEN=$$(cat vault/secrets/root-token 2>/dev/null); \
	if [ -z "$$TOKEN" ]; then \
		echo "$(YELLOW)No root-token file — run 'make prod-up' first.$(RESET)"; exit 1; \
	fi; \
	$(DC_PROD) exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN="$$TOKEN" \
		vault vault kv get secret/alpacaparty

# Unseal a Vault that was resealed (manually or via prod-vault-reseal).
prod-vault-unseal:
	@KEY=$$(grep -o '"unseal_keys_b64": *\["[^"]*"' vault/secrets/vault-init.json | grep -o '"[^"]*"' | tail -1 | tr -d '"'); \
	if [ -z "$$KEY" ]; then \
		echo "$(YELLOW)No unseal key on disk.$(RESET)"; exit 1; \
	fi; \
	$(DC_PROD) exec -e VAULT_ADDR=http://127.0.0.1:8200 vault vault operator unseal "$$KEY"

# Seal Vault — useful demo of "secrets become inaccessible the moment Vault
# locks". After this, backend will fail to fetch new secrets until you
# `make prod-vault-unseal`.
prod-vault-reseal:
	@TOKEN=$$(cat vault/secrets/root-token 2>/dev/null); \
	if [ -z "$$TOKEN" ]; then \
		echo "$(YELLOW)No root-token file on disk.$(RESET)"; exit 1; \
	fi; \
	$(DC_PROD) exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN="$$TOKEN" \
		vault vault operator seal && \
	echo "$(GREEN)✓ Vault sealed — backend can no longer read secrets$(RESET)"

# Re-run vault-init to push updated .env values into Vault. The script is
# idempotent — same payload is a no-op as far as the app is concerned.
prod-vault-reseed:
	$(DC_PROD) run --rm vault-init
	@echo "$(GREEN)✓ Vault reseeded — restart the backend to pick up new secrets$(RESET)"
	@echo "$(YELLOW)  make prod-down && make prod-up$(RESET)"

# Nuclear option: destroy persistent vault data + the saved keys so the next
# `make prod-up` runs `operator init` from scratch.
prod-vault-wipe:
	@echo "$(YELLOW)⚠  This will destroy all Vault data and the saved unseal key.$(RESET)"
	@printf "Are you sure? [y/N] " && read ans && [ "$$ans" = "y" ] || (echo "aborted"; exit 1)
	$(DC_PROD) stop vault vault-init 2>/dev/null || true
	$(DC_PROD) rm -f vault vault-init 2>/dev/null || true
	@docker volume rm $(COMPOSE_PROJECT)_vault_data 2>/dev/null || true
	@rm -f vault/secrets/vault-init.json vault/secrets/root-token
	@echo "$(GREEN)✓ Vault wiped. Next 'make prod-up' will run a fresh init.$(RESET)"

# ── WAF (ModSecurity) ───────────────────────────────────────
waf-logs:
	$(DC_PROD) exec nginx tail -f /var/log/modsecurity/audit.log

# Fire a textbook SQL-injection payload at the API — ModSecurity should 403
# before it ever reaches the Express app.
waf-test:
	@echo "$(CYAN)Firing a known-bad SQLi payload at nginx…$(RESET)"
	@curl -sk -o /dev/null -w "HTTP %{http_code}\n" \
	  "https://localhost/api/users?filter[username]=1%27%20OR%20%271%27=%271" \
	  || true
	@echo "$(YELLOW)Expected: HTTP 403 (blocked). If you see 200, the WAF is bypassed.$(RESET)"

# ============================================================================
# DEMO TARGETS — one per module on the evaluation checklist.
# These are wrappers that print a hint and run the right command. They are
# safe to run repeatedly and never destroy state on their own.
# ============================================================================

demo-list:
	@echo ""
	@echo "$(CYAN)$(BOLD)Demo targets$(RESET) $(YELLOW)(see EVALUATION.md for the talking points)$(RESET)"
	@echo ""
	@echo "  $(BOLD)Web modules$(RESET)"
	@echo "    $(GREEN)demo-frameworks$(RESET)        Vue 3 + Express stack proof (Major, 2pts)"
	@echo "    $(GREEN)demo-realtime$(RESET)          Show socket events flying live (Major, 2pts)"
	@echo "    $(GREEN)demo-user-interaction$(RESET)  Chat + profile + friends roundtrip (Major, 2pts)"
	@echo "    $(GREEN)demo-public-api$(RESET)        API-key roundtrip + Swagger UI (Major, 2pts)"
	@echo "    $(GREEN)demo-orm$(RESET)               Prisma + model count (Minor, 1pt)"
	@echo "    $(GREEN)demo-notifications$(RESET)     Create→push→persist notification (Minor, 1pt)"
	@echo "    $(GREEN)demo-uploads$(RESET)           Upload, preview, delete (Minor, 1pt)"
	@echo ""
	@echo "  $(BOLD)User management$(RESET)"
	@echo "    $(GREEN)demo-user-mgmt$(RESET)         Signup → profile → friends → avatar (Major, 2pts)"
	@echo "    $(GREEN)demo-stats$(RESET)             Per-game stats, history, leaderboard (Minor, 1pt)"
	@echo ""
	@echo "  $(BOLD)AI / Cybersecurity$(RESET)"
	@echo "    $(GREEN)demo-llm$(RESET)               Help-desk chat → Groq round-trip (Major, 2pts)"
	@echo "    $(GREEN)demo-waf$(RESET)               WAF blocks a known-bad payload (Major part 1)"
	@echo "    $(GREEN)demo-vault$(RESET)             Vault sealed/unsealed + secret read (Major part 2)"
	@echo ""
	@echo "  $(BOLD)Gaming$(RESET)"
	@echo "    $(GREEN)demo-spit-royale$(RESET)       First game live (Major, 2pts)"
	@echo "    $(GREEN)demo-alpaca-road$(RESET)       Second game + matchmaking (Major, 2pts)"
	@echo "    $(GREEN)demo-three$(RESET)             3D farm world (Major, 2pts)"
	@echo "    $(GREEN)demo-customization$(RESET)     Power-ups + maps + settings (Minor, 1pt)"
	@echo "    $(GREEN)demo-gamification$(RESET)      Achievements + XP + daily challenges (Minor, 1pt)"
	@echo ""
	@echo "  $(BOLD)Mandatory / supporting$(RESET)"
	@echo "    $(GREEN)demo-https$(RESET)             Curl https://localhost — TLS termination at nginx"
	@echo "    $(GREEN)demo-admin$(RESET)             Admin login + dashboard (operator tooling, not claimed)"
	@echo ""

demo-frameworks:
	@echo "$(CYAN)$(BOLD)Module: Web — frontend + backend frameworks (Major, 2pts)$(RESET)"
	@echo "  Frontend: $(YELLOW)Vue 3 + Vite + Pinia + Vue Router$(RESET)"
	@echo "  Backend:  $(YELLOW)Express.js (Node 24, ESM, modular controllers/services/routes)$(RESET)"
	@echo ""
	@echo "  Stack visible in 'package.json':"
	@grep -E '"vue":|"express":|"vue-router":|"pinia":|"socket.io":' frontend/package.json backend/package.json 2>/dev/null | sed 's/^/    /'
	@echo ""
	@echo "  See EVALUATION.md → Web frameworks for the file pointers."

demo-realtime:
	@echo "$(CYAN)$(BOLD)Module: Web — real-time via WebSockets (Major, 2pts)$(RESET)"
	@echo "  Open two tabs, log in as different users, send a DM. The receiver sees it"
	@echo "  arrive without a refresh. Or: $(YELLOW)$(DC) logs -f backend | grep '\\[socket\\]'$(RESET)"
	@echo "  Then: tail the backend logs and watch presence + dm:message events in real time."
	@echo ""
	$(DC) logs --tail=30 backend | grep -i 'socket\|presence\|dm:' || \
	  echo "$(YELLOW)  (no socket activity yet — connect a client and try again)$(RESET)"

demo-user-interaction:
	@echo "$(CYAN)$(BOLD)Module: Web — user interaction (Major, 2pts)$(RESET)"
	@echo "  • Chat:    POST /api/chat/dm OR socket 'dm:send'"
	@echo "  • Profile: GET /api/users/:id"
	@echo "  • Friends: POST /api/friends/requests, PUT /api/friends/requests/:id/accept"
	@echo ""
	@echo "  Live walkthrough: open the app, add a friend, send them a DM."
	@echo "  Files: backend/src/controllers/{chat,friend,user}Controller.js"

demo-public-api:
	@echo "$(CYAN)$(BOLD)Module: Web — Public API with key + rate limit (Major, 2pts)$(RESET)"
	@echo ""
	@echo "  Step 1: generate an API key in the UI (Profile → API tab) — store as KEY"
	@echo "  Step 2: $(YELLOW)curl -k -H \"X-API-Key: \$$KEY\" https://localhost/api/public/users$(RESET)"
	@echo "  Step 3: $(YELLOW)curl -k -H \"X-API-Key: \$$KEY\" -X POST \\\\$(RESET)"
	@echo "          $(YELLOW)  -H 'Content-Type: application/json' \\\\$(RESET)"
	@echo "          $(YELLOW)  -d '{\"content\":\"hello from API\"}' \\\\$(RESET)"
	@echo "          $(YELLOW)  https://localhost/api/public/posts$(RESET)"
	@echo "  Step 4: Hit it 31 times in 60s → second-half requests return 429 (rate-limited)."
	@echo "  Docs:   https://localhost/api/docs/public  (Swagger UI)"

demo-orm:
	@echo "$(CYAN)$(BOLD)Module: Web — ORM (Minor, 1pt)$(RESET)"
	@echo "  Stack: Prisma + @prisma/adapter-pg"
	@echo -n "  Models in schema: "
	@grep -c '^model ' backend/prisma/schema.prisma
	@echo "  Schema file: backend/prisma/schema.prisma"
	@echo "  Migration trail: backend/prisma/migrations/  (per-migration SQL files)"

demo-notifications:
	@echo "$(CYAN)$(BOLD)Module: Web — Notification system (Minor, 1pt)$(RESET)"
	@echo "  Trigger: send a friend request to user A. As A you see a 🔔 badge and"
	@echo "  a row in the Notification table:"
	@echo ""
	@echo "  $(YELLOW)make shell-db$(RESET) → SELECT * FROM \"Notification\" ORDER BY \"createdAt\" DESC LIMIT 5;"
	@echo "  Files: backend/src/services/notificationService.js, models/Notification.js"

demo-uploads:
	@echo "$(CYAN)$(BOLD)Module: Web — File uploads (Minor, 1pt)$(RESET)"
	@echo "  Upload via the UI (Profile → avatar) or curl:"
	@echo "    $(YELLOW)curl -k -b 'jwt_token=…' -F 'file=@me.png' https://localhost/api/uploads$(RESET)"
	@echo "  Backend validates: MIME whitelist + magic bytes + 10 MB cap + filename hash."
	@echo "  Files: backend/src/services/uploadService.js, controllers/uploadController.js"

demo-user-mgmt:
	@echo "$(CYAN)$(BOLD)Module: User management (Major, 2pts)$(RESET)"
	@echo "  Flow: register → /auth/login → /users/me → upload avatar →"
	@echo "        add friend → see online status on their profile."
	@echo "  Friend system: bidirectional, persistent, real-time presence via socket."
	@echo "  Files: backend/src/controllers/{auth,user,friend}Controller.js"

demo-stats:
	@echo "$(CYAN)$(BOLD)Module: Game statistics & match history (Minor, 1pt)$(RESET)"
	@echo "  Endpoints:"
	@echo "    GET /api/game/stats?gameType=spit_royale"
	@echo "    GET /api/game/history?limit=20"
	@echo "    GET /api/game/leaderboard?board=kills|obstacles|coins"
	@echo "    GET /api/game/achievements"
	@echo "  Persist path: SpitRoyaleMatch / AlpacaRoadMatch → Game.updateStats → GameStat table."

demo-llm:
	@echo "$(CYAN)$(BOLD)Module: LLM system interface (Major, 2pts)$(RESET)"
	@echo "  Open the app → bottom-right help-desk widget → ask 'how do I add a friend?'"
	@echo "  Backend route: POST /api/helpdesk/chat (streamed to client)"
	@echo "  Provider:      Groq (server-side key rotation, never exposed to browser)"
	@echo "  Files: backend/src/routes/helpdesk.js"

demo-waf:
	@echo "$(CYAN)$(BOLD)Module: Cybersecurity — WAF (Major part 1)$(RESET)"
	@echo "  Stack: nginx + ModSecurity 3 + OWASP CRS 3.3.9 in strict mode"
	@echo ""
	@echo "  Tail the audit log: $(YELLOW)make waf-logs$(RESET)  (in another terminal)"
	@$(MAKE) --no-print-directory waf-test
	@echo ""
	@echo "  Files: nginx/conf/nginx.prod.conf, nginx/modsec/*"

demo-vault:
	@echo "$(CYAN)$(BOLD)Module: Cybersecurity — Vault (Major part 2)$(RESET)"
	@echo ""
	@echo "  $(BOLD)1. Vault status (file backend, sealed-by-default):$(RESET)"
	@$(MAKE) --no-print-directory prod-vault-status || true
	@echo ""
	@echo "  $(BOLD)2. The KV store the backend reads from:$(RESET)"
	@$(MAKE) --no-print-directory prod-vault-secrets || true
	@echo ""
	@echo "  $(BOLD)3. The unseal key + root token (host-only, gitignored):$(RESET)"
	@echo "     ls -la vault/secrets/  →  vault-init.json (chmod 600)"
	@ls -la vault/secrets/ 2>/dev/null | sed 's/^/     /'
	@echo ""
	@echo "  Want to prove Vault is the gate? Try:"
	@echo "    $(YELLOW)make prod-vault-reseal$(RESET)   — Vault locks"
	@echo "    $(YELLOW)make prod-down && make prod-up$(RESET)  — backend now fails to read secrets"
	@echo "    $(YELLOW)make prod-vault-unseal$(RESET)   — restore service"

demo-spit-royale:
	@echo "$(CYAN)$(BOLD)Module: Web-based game — Spit Royale (Major, 2pts)$(RESET)"
	@echo "  Real-time 2-10 player arena over /minigames socket namespace."
	@echo "  • Live demo: open the app on two browsers, both join the same room, last alpaca wins."
	@echo "  • Server-authoritative: hit detection / cooldowns / range — see SpitRoyaleMatch.js"
	@echo "  • Persistence: $(YELLOW)Game.updateStats$(RESET) + $(YELLOW)Game.incrementCounter('kills', …)$(RESET)"

demo-alpaca-road:
	@echo "$(CYAN)$(BOLD)Module: Add another game with matchmaking — Alpaca Road (Major, 2pts)$(RESET)"
	@echo "  Up to 4 lanes / 4 players. Independent GameStat row, independent leaderboard."
	@echo "  Matchmaking: MatchManager joins waiting players, instantiates AlpacaRoadMatch."
	@echo "  Files: backend/src/services/{AlpacaRoadMatch,MatchManager}.js"

demo-three:
	@echo "$(CYAN)$(BOLD)Module: Advanced 3D graphics (Major, 2pts)$(RESET)"
	@echo "  Open the app → 'AlpacaFarm' tab → custom Three.js world: lighting, rigged"
	@echo "  alpaca models, edit mode, build mode, shop."
	@echo "  Files: frontend/src/games/Game.vue, frontend/src/games/world/*, core/*"

demo-customization:
	@echo "$(CYAN)$(BOLD)Module: Game customization (Minor, 1pt)$(RESET)"
	@echo "  • Power-ups & abilities in both games"
	@echo "  • Map / theme variants"
	@echo "  • Per-game settings (match length, power-up toggles)"
	@echo "  Live: open the game settings panel from the lobby."

demo-gamification:
	@echo "$(CYAN)$(BOLD)Module: Gamification (Minor, 1pt) — 5 of 6 mechanics$(RESET)"
	@echo "  ✓ Achievements (Achievement / UserAchievement tables)"
	@echo "  ✓ Leaderboards (ELO with K=32)"
	@echo "  ✓ XP / Level (UserStats.xp + auto-levelup notifications)"
	@echo "  ✓ Daily challenges (DailyChallenge / UserDailyChallenge)"
	@echo "  ✓ Rewards (AlpacaFarm.coins + XP bonuses)"
	@echo "  File: backend/src/services/GamificationService.js"

demo-admin:
	@echo "$(CYAN)$(BOLD)Operator tooling: admin panel (not claimed as a module)$(RESET)"
	@echo "  Login: https://localhost/admin/login"
	@echo "  Default creds (dev seed): admin / AdminPassword123"
	@echo "  Capabilities: dashboard, analytics, ban/unban, role mgmt (superadmin only),"
	@echo "                Vault permissions blob (superadmin only)."
	@echo "  Not claimed as a module — bundled to support evaluator demos & operator workflow."

demo-https:
	@echo "$(CYAN)$(BOLD)Mandatory: HTTPS everywhere$(RESET)"
	@echo "  Frontend → nginx (443, TLS terminated)  → backend (HTTP, container network)"
	@curl -k -sI https://localhost/ | head -5 | sed 's/^/  /'
	@echo "  Inter-service traffic is HTTP only (subject permits: 'Connections inside"
	@echo "  the backend itself can be without encryption')."

# ── CLEANUP ─────────────────────────────────────────────────
clean:
	$(DC) down --rmi all --remove-orphans
	$(DC_PROD) down --rmi all --remove-orphans

clean-volumes:
	$(DC) down --rmi all --volumes --remove-orphans
	$(DC_PROD) down --rmi all --volumes --remove-orphans

fclean:
	$(DC) down --rmi all --volumes --remove-orphans
	$(DC_PROD) down --rmi all --volumes --remove-orphans
	@docker network ls --format '{{.ID}} {{.Name}}' | awk '$$2=="$(COMPOSE_PROJECT)_alpacaparty_net" {print $$1}' | xargs -r docker network rm >/dev/null 2>&1 || true
	@docker volume ls -q --filter "label=com.docker.compose.project=$(COMPOSE_PROJECT)" | xargs -r docker volume rm -f >/dev/null 2>&1 || true
	@docker volume prune -f >/dev/null
	@docker network prune -f >/dev/null
	@docker image prune -f >/dev/null
	@docker builder prune -f >/dev/null
	@rm -rf backend/node_modules
	@rm -rf frontend/node_modules
	@echo "$(GREEN)✓ Full Docker cleanup complete for project $(COMPOSE_PROJECT)$(RESET)"

deep-clean:
	@echo "$(YELLOW)Running aggressive Docker cleanup (global).$(RESET)"
	$(DC) down --rmi all --volumes --remove-orphans || true
	$(DC_PROD) down --rmi all --volumes --remove-orphans || true
	@docker system prune -af --volumes
	@docker builder prune -af
	@rm -rf backend/node_modules
	@rm -rf frontend/node_modules
	@echo "$(GREEN)✓ Aggressive Docker cleanup complete$(RESET)"

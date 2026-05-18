# ============================================================================
# ALPACAPARTY — Makefile
# @owner   ValGSgit
# @issue   https://github.com/ValGSgit/AlpacaParty/issues/6
# ============================================================================

# ── Colours ─────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# ── Docker ──────────────────────────────────────────────────
COMPOSE_PROJECT := alpacaparty-ft_transcendence
DC       := docker compose --profile dev
DC_TEST  := docker compose --profile test --env-file .env.test
DC_E2E   := docker compose --profile dev --profile e2e
DC_PROD  := docker compose -f compose.prod.yaml

.DEFAULT_GOAL := help
.PHONY: help up down build logs restart ps \
        prod-up prod-down prod-build prod-logs \
        generate-secrets ssl-certs create-dirs \
        clean clean-volumes fclean deep-clean \
        install install-backend install-frontend \
        dev dev-backend dev-frontend \
        shell-backend shell-frontend shell-db shell-nginx \
        prisma_studio backend-cmd \
        test backend-test backend-test-watch e2e prod-e2e test-local \
        stress-test stress-test-build stress-test-live \
        seed-example seed-example-reset prod-seed-example prod-seed-example-reset \
        seed-live seed-live-reset prod-seed-live prod-seed-live-reset \
        vault-status vault-secrets vault-shell \
        prod-vault-status prod-vault-unseal prod-vault-rotate-token prod-vault-reseed \
        waf-logs

# ── HELP ────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(CYAN)========== AlpacaParty ===========$(RESET)"
	@echo ""
	@echo "$(YELLOW)Docker Development$(RESET)"
	@echo "  $(GREEN)make up$(RESET)             Start all containers (dev mode)"
	@echo "  $(GREEN)make down$(RESET)           Stop all containers"
	@echo "  $(GREEN)make build$(RESET)          Build / rebuild images"
	@echo "  $(GREEN)make logs$(RESET)           Tail container logs"
	@echo "  $(GREEN)make restart$(RESET)        Restart containers"
	@echo "  $(GREEN)make ps$(RESET)             Show container status"
	@echo ""
	@echo "$(YELLOW)Docker Production$(RESET)"
	@echo "  $(GREEN)make prod-up$(RESET)           Start production containers"
	@echo "  $(GREEN)make prod-down$(RESET)         Stop production containers"
	@echo "  $(GREEN)make prod-build$(RESET)        Build production images"
	@echo "  $(GREEN)make prod-logs$(RESET)         View production logs"
	@echo "  $(GREEN)make generate-secrets$(RESET)  Rotate DB_PASSWORD + JWT secrets in .env"
	@echo "  $(GREEN)make ssl-certs$(RESET)         Generate self-signed SSL certificate"
	@echo ""
	@echo "$(YELLOW)Local Dev (no Docker)$(RESET)"
	@echo "  $(GREEN)make install$(RESET)        npm install in backend & frontend"
	@echo "  $(GREEN)make dev$(RESET)            Run backend + frontend locally"
	@echo "  $(GREEN)make dev-backend$(RESET)    Run backend only"
	@echo "  $(GREEN)make dev-frontend$(RESET)   Run frontend only"
	@echo ""
	@echo "$(YELLOW)Shells$(RESET)"
	@echo "  $(GREEN)make shell-backend$(RESET)  Shell into backend container"
	@echo "  $(GREEN)make shell-frontend$(RESET) Shell into frontend container"
	@echo "  $(GREEN)make shell-db$(RESET)       psql into postgres container"
	@echo "  $(GREEN)make shell-nginx$(RESET)    Shell into nginx container"
	@echo ""
	@echo "$(YELLOW)Testing$(RESET)"
	@echo "  $(GREEN)make test$(RESET)              Run backend tests in container"
	@echo "  $(GREEN)make test-local$(RESET)        Run backend tests locally (no Docker)"
	@echo "  $(GREEN)make e2e$(RESET)               Run E2E tests against dev stack"
	@echo "  $(GREEN)make prod-e2e$(RESET)          Seed data + run E2E tests against prod stack"
	@echo "  $(GREEN)make stress-test$(RESET)       Run full containerized stress & security tests"
	@echo "  $(GREEN)make stress-test-build$(RESET) Build stress-test image only (skip auto-run)"
	@echo "  $(GREEN)make stress-test-live$(RESET)  Watch stress-test results as they complete"
	@echo ""
	@echo "$(YELLOW)Database$(RESET)"
	@echo "  $(GREEN)make seed-live$(RESET)            Seed sample data (dev)"
	@echo "  $(GREEN)make seed-live-reset$(RESET)      Reset and reseed sample data (dev)"
	@echo "  $(GREEN)make seed-admin$(RESET)           Seed default admin user (dev)"
	@echo "  $(GREEN)make prod-seed-live$(RESET)       Seed sample data (prod)"
	@echo "  $(GREEN)make prod-seed-live-reset$(RESET) Reset and reseed sample data (prod)"
	@echo "  $(GREEN)make prod-seed-admin$(RESET)      Seed default admin user (prod)"
	@echo ""
	@echo "$(YELLOW)Security$(RESET)"
	@echo "  $(GREEN)make vault-status$(RESET)              Show Vault seal/HA status (dev)"
	@echo "  $(GREEN)make vault-secrets$(RESET)             List secrets stored in Vault (dev)"
	@echo "  $(GREEN)make vault-shell$(RESET)               Open interactive Vault shell (dev)"
	@echo "  $(GREEN)make prod-vault-status$(RESET)         Show prod Vault status"
	@echo "  $(GREEN)make prod-vault-unseal$(RESET)         Manually unseal prod Vault"
	@echo "  $(GREEN)make prod-vault-rotate-token$(RESET)   Create new limited service token"
	@echo "  $(GREEN)make prod-vault-reseed$(RESET)         Re-run vault-init to push new secrets"
	@echo "  $(GREEN)make waf-logs$(RESET)                  Tail ModSecurity audit log (prod)"
	@echo ""
	@echo "$(YELLOW)Cleanup$(RESET)"
	@echo "  $(GREEN)make clean$(RESET)          Stop containers & remove images"
	@echo "  $(GREEN)make clean-volumes$(RESET)  Also remove persistent volumes"
	@echo "  $(GREEN)make fclean$(RESET)         Project full cleanup + dangling prune"
	@echo "  $(GREEN)make deep-clean$(RESET)     Aggressive global Docker prune (ALL unused)"
	@echo ""

# ── DOCKER ──────────────────────────────────────────────────
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

# ── SETUP ───────────────────────────────────────────────────
create-dirs:
	@mkdir -p backend/node_modules
	@mkdir -p frontend/node_modules

# ── SECRETS ─────────────────────────────────────────────────
# Generates .env from .env.example with cryptographically random secrets.
# Run once before first prod deploy, or again to rotate (requires DB re-init).
generate-secrets:
	@if [ ! -f .env ]; then \
	  cp .env.example .env; \
	  echo "$(GREEN)✓ Created .env from .env.example$(RESET)"; \
	fi
	@DB_NAME=$$(grep '^DB_NAME=' .env | cut -d= -f2-); \
	  DB_NAME=$${DB_NAME:-alpacaparty}; \
	  DB_USER=$$(grep '^DB_USER=' .env | cut -d= -f2-); \
	  DB_USER=$${DB_USER:-alpacaparty}; \
	  DB_PASS=$$(openssl rand -hex 24) && \
	  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$$DB_PASS|" .env && \
	  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://$$DB_USER:$$DB_PASS@postgres:5432/$$DB_NAME?schema=public|" .env && \
	  echo "$(GREEN)✓ DB_PASSWORD randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
	  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$$JWT|" .env && \
	  echo "$(GREEN)✓ JWT_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
	  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$$JWT|" .env && \
	  echo "$(GREEN)✓ JWT_REFRESH_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
	  sed -i "s|^JWT_PUBLIC_API_SECRET=.*|JWT_PUBLIC_API_SECRET=$$JWT|" .env && \
	  echo "$(GREEN)✓ JWT_PUBLIC_API_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
	  sed -i "s|^ADMIN_JWT_SECRET=.*|ADMIN_JWT_SECRET=$$JWT|" .env && \
	  echo "$(GREEN)✓ ADMIN_JWT_SECRET randomised$(RESET)"
	@echo "$(GREEN)✓ DATABASE_URL synced with DB credentials$(RESET)"
	@echo "$(YELLOW)  Secrets written to .env — keep this file out of version control$(RESET)"

# ── SSL CERTIFICATES ────────────────────────────────────────
# Generates a self-signed certificate for local HTTPS development.
# Includes SANs so the cert is valid for inter-service TLS (vault, backend, nginx).
ssl-certs:
	@mkdir -p ssl
	@if [ ! -f ssl/cert.pem ]; then \
	  openssl req -x509 -newkey rsa:2048 -nodes \
	    -keyout ssl/key.pem \
	    -out ssl/cert.pem \
	    -days 365 \
	    -subj '/CN=localhost' \
	    -addext 'subjectAltName=DNS:localhost,DNS:frontend,DNS:vault,DNS:backend,DNS:nginx,IP:127.0.0.1' \
	    2>/dev/null && \
	  echo "$(GREEN)✓ Self-signed certificate generated in ssl/$(RESET)"; \
	else \
	  echo "$(YELLOW)  Certificate already exists — skipping$(RESET)"; \
	fi
	chmod +rw ssl/key.pem
	chmod +rw ssl/cert.pem

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
backend-test: create-dirs
	@EXIT_CODE=0; \
	$(DC_TEST) run --rm backend_test npm test $(options) || EXIT_CODE=$$?; \
	$(DC_TEST) down -v --remove-orphans; \
	exit $$EXIT_CODE

backend-test-watch: create-dirs
	@EXIT_CODE=0; \
	$(DC_TEST) run --rm backend_test npm run test:watch $(options) || EXIT_CODE=$$?; \
	$(DC_TEST) down -v --remove-orphans; \
	exit $$EXIT_CODE

test: backend-test

e2e: create-dirs seed-live
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
	  -e E2E_BASE_URL=https://nginx:8443 \
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

# ── SECURITY / VAULT ────────────────────────────────────────
vault-status:
	$(DC) exec vault vault status

vault-secrets:
	$(DC) exec vault vault kv get secret/alpacaparty

vault-shell:
	$(DC) exec -e VAULT_ADDR=http://127.0.0.1:8200 \
	           -e VAULT_TOKEN=$${VAULT_DEV_TOKEN:-alpacaparty-dev-token} \
	           vault sh

waf-logs:
	$(DC_PROD) exec nginx tail -f /var/log/modsecurity/audit.log

# ── PRODUCTION VAULT MANAGEMENT ─────────────────────────────
prod-vault-status:
	$(DC_PROD) exec vault vault status

# Manually unseal prod vault (if vault-init container is no longer running).
# Requires VAULT_UNSEAL_KEY in .env.
prod-vault-unseal:
	$(DC_PROD) exec \
	  -e VAULT_ADDR=https://vault:8200 \
	  -e VAULT_SKIP_VERIFY=true \
	  vault vault operator unseal $${VAULT_UNSEAL_KEY}

# Re-run vault-init to push updated secrets (e.g. after adding new keys to .env).
prod-vault-reseed:
	$(DC_PROD) run --rm vault-init
	@echo "$(GREEN)✓ Vault reseeded — restart the backend to pick up new secrets$(RESET)"
	@echo "$(YELLOW)  make prod-down && make prod-up$(RESET)"

# Create a new limited read-only service token.
# Copy the printed token into VAULT_TOKEN in .env, then restart:
#   make prod-down && make prod-up
prod-vault-rotate-token:
	@$(DC_PROD) exec \
	  -e VAULT_ADDR=https://vault:8200 \
	  -e VAULT_TOKEN=$${VAULT_TOKEN} \
	  -e VAULT_SKIP_VERIFY=true \
	  vault vault token create \
	    -policy=alpacaparty-backend \
	    -ttl=2160h \
	    -renewable=true \
	    -display-name=alpacaparty-backend \
	    -format=json \
	  | grep '"client_token"' \
	  | sed 's/.*"client_token": *"\(.*\)".*/\1/' \
	  | xargs -I{} echo "New VAULT_TOKEN: {}"

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

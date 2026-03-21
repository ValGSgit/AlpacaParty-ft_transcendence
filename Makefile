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
COMPOSE_PROJECT := my
DC := docker compose
DC_PROD := docker compose -f compose.prod.yaml

.DEFAULT_GOAL := help
.PHONY: help up down build logs restart ps \
        prod-up prod-down prod-build prod-logs \
        generate-secrets ssl-certs \
	clean clean-volumes fclean deep-clean \
        install install-backend install-frontend \
        dev dev-backend dev-frontend \
        shell-backend shell-frontend shell-db \
	test e2e prod-e2e test-local seed-admins seed-live seed-live-reset prod-seed-live prod-seed-live-reset \
        vault-status vault-secrets vault-shell waf-logs

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
	@echo "  $(GREEN)make generate-secrets$(RESET)  Rotate DB_PASSWORD + JWT_SECRET in .env"
	@echo "  $(GREEN)make ssl-certs$(RESET)          Generate self-signed SSL certificate"
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
	@echo ""
	@echo "$(YELLOW)Testing$(RESET)"
	@echo "  $(GREEN)make test$(RESET)           Run backend tests in container"
	@echo "  $(GREEN)make test-local$(RESET)     Run backend tests locally (no Docker)"
	@echo "  $(GREEN)make e2e$(RESET)            Run E2E tests against dev stack"
	@echo "  $(GREEN)make prod-e2e$(RESET)       Seed data + run E2E tests against prod stack"
	@echo ""
	@echo "$(YELLOW)Database$(RESET)"
	@echo "  $(GREEN)make seed-admins$(RESET)    Promote developer accounts to admin"
	@echo "  $(GREEN)make seed-live$(RESET)      Seed high-volume sample data (dev compose)"
	@echo "  $(GREEN)make seed-live-reset$(RESET) Reset and reseed high-volume sample data (dev compose)"
	@echo "  $(GREEN)make prod-seed-live$(RESET) Seed high-volume sample data (prod compose)"
	@echo "  $(GREEN)make prod-seed-live-reset$(RESET) Reset and reseed high-volume sample data (prod compose)"
	@echo ""
	@echo "$(YELLOW)Security$(RESET)"
	@echo "  $(GREEN)make vault-status$(RESET)   Show Vault seal/HA status"
	@echo "  $(GREEN)make vault-secrets$(RESET)  List secrets stored in Vault (dev)"
	@echo "  $(GREEN)make vault-shell$(RESET)    Open interactive Vault shell"
	@echo "  $(GREEN)make waf-logs$(RESET)       Tail ModSecurity audit log"
	@echo ""
	@echo "$(YELLOW)Cleanup$(RESET)"
	@echo "  $(GREEN)make clean$(RESET)          Stop containers & remove images"
	@echo "  $(GREEN)make clean-volumes$(RESET)  Also remove persistent volumes"
	@echo "  $(GREEN)make fclean$(RESET)         Project full cleanup + dangling prune"
	@echo "  $(GREEN)make deep-clean$(RESET)     Aggressive global Docker prune (ALL unused)"
	@echo ""

# ── DOCKER ──────────────────────────────────────────────────
up: ssl-certs
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

# ── SECRETS ─────────────────────────────────────────────────
# Generates .env from .env.example with cryptographically random
# DB_PASSWORD and JWT_SECRET.  Run once before first prod deploy,
# or explicitly to rotate secrets (requires DB re-initialisation).
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
	@echo "$(GREEN)✓ DATABASE_URL synced with DB credentials$(RESET)"
	@echo "$(YELLOW)  Secrets written to .env — keep this file out of version control$(RESET)"

# ── SSL CERTIFICATES ────────────────────────────────────────
# Generates a self-signed certificate for local HTTPS development.
ssl-certs:
	@mkdir -p nginx/ssl backend/ssl
	@if [ ! -f nginx/ssl/cert.pem ]; then \
	  openssl req -x509 -newkey rsa:2048 -nodes \
	    -keyout nginx/ssl/key.pem \
	    -out nginx/ssl/cert.pem \
	    -days 365 \
	    -subj '/CN=localhost' 2>/dev/null && \
	  echo "$(GREEN)✓ Self-signed certificate generated in nginx/ssl/$(RESET)"; \
	else \
	  echo "$(YELLOW)  Certificate already exists — skipping$(RESET)"; \
	fi
	@if [ ! -f backend/ssl/cert.pem ]; then \
	  cp nginx/ssl/cert.pem backend/ssl/cert.pem && \
	  cp nginx/ssl/key.pem backend/ssl/key.pem && \
	  echo "$(GREEN)✓ Self-signed certificate copied to backend/ssl/$(RESET)"; \
	else \
	  echo "$(YELLOW)  Backend certificate already exists — skipping$(RESET)"; \
	fi

# Ensure .env exists with real secrets before any prod command.
# Does NOT regenerate if .env already exists (keeps DB password stable).
.env:
	@echo "$(YELLOW)No .env found — generating one with random secrets…$(RESET)"
	@$(MAKE) --no-print-directory generate-secrets

# ── PRODUCTION ──────────────────────────────────────────────
prod-up: .env ssl-certs
	$(DC_PROD) up -d --build

prod-down:
	$(DC_PROD) down

prod-build: .env
	$(DC_PROD) build --no-cache

prod-logs:
	$(DC_PROD) logs -f

# ── LOCAL DEV ───────────────────────────────────────────────
install:
	cd backend  && npm install
	cd frontend && npm install

dev:
	@echo "Starting backend & frontend…"
	cd backend  && npm run dev & \
	cd frontend && npm run dev

dev-backend:
	cd backend && npm run dev

# TESTING ─────────────────────────────────────────────────
test:
	$(DC) exec backend npm test

e2e:
	$(DC) exec e2e npm test

# Production E2E: seeds data and runs Playwright against the production build
prod-e2e: prod-seed-live
	@echo "$(CYAN)Running E2E tests against production build…$(RESET)"
	cd e2e && E2E_BASE_URL=https://localhost:8080 npx playwright test
	@echo "$(GREEN)✓ Production E2E tests complete$(RESET)"

# Run unit tests locally (no Docker)
test-local:
	cd backend && npm test

dev-frontend:
	cd frontend && npm run dev

# ── SHELLS ──────────────────────────────────────────────────
shell-backend:
	$(DC) exec backend sh

shell-frontend:
	$(DC) exec frontend sh

shell-db:
	$(DC) exec postgres psql -U $${DB_USER:-alpacaparty} -d $${DB_NAME:-alpacaparty}

# ── DATABASE SEEDS ──────────────────────────────────────────
# Requires the postgres container to be running (make up / make prod-up).
seed-admins:
	$(DC) exec -T postgres psql \
	  -U $${DB_USER:-alpacaparty} \
	  -d $${DB_NAME:-alpacaparty} \
	  -f /dev/stdin < scripts/seed-admins.sql

seed-live:
	$(DC) exec backend npm run seed:live

seed-live-reset:
	$(DC) exec backend npm run seed:live:reset

prod-seed-live:
	$(DC_PROD) exec backend npm run seed:live

prod-seed-live-reset:
	$(DC_PROD) exec backend npm run seed:live:reset

# ── SECURITY ────────────────────────────────────────────────────────────────
vault-status:
	$(DC) exec vault vault status

vault-secrets:
	$(DC) exec vault vault kv get secret/alpacaparty

vault-shell:
	$(DC) exec -e VAULT_ADDR=http://127.0.0.1:8200 \
	           -e VAULT_TOKEN=$${VAULT_DEV_TOKEN:-alpacaparty-dev-token} \
	           vault sh

waf-logs:
	$(DC) exec nginx tail -f /var/log/modsecurity/audit.log

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
	@echo "$(GREEN)✓ Full Docker cleanup complete for project $(COMPOSE_PROJECT)$(RESET)"

deep-clean:
	@echo "$(YELLOW)Running aggressive Docker cleanup (global).$(RESET)"
	$(DC) down --rmi all --volumes --remove-orphans || true
	$(DC_PROD) down --rmi all --volumes --remove-orphans || true
	@docker system prune -af --volumes
	@docker builder prune -af
	@echo "$(GREEN)✓ Aggressive Docker cleanup complete$(RESET)"

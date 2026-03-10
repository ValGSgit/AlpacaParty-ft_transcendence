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
DC := docker compose
DC_PROD := docker compose -f docker-compose.prod.yml

.DEFAULT_GOAL := help
.PHONY: help up down build logs restart ps \
        prod-up prod-down prod-build prod-logs \
        generate-secrets ssl-certs \
        clean clean-volumes \
        install install-backend install-frontend \
        dev dev-backend dev-frontend \
        shell-backend shell-frontend shell-db \
        test

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
	@echo ""
	@echo "$(YELLOW)Cleanup$(RESET)"
	@echo "  $(GREEN)make clean$(RESET)          Stop containers & remove images"
	@echo "  $(GREEN)make clean-volumes$(RESET)  Also remove persistent volumes"
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
	@DB_PASS=$$(openssl rand -hex 24) && \
	  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$$DB_PASS|" .env && \
	  echo "$(GREEN)✓ DB_PASSWORD randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
	  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$$JWT|" .env && \
	  echo "$(GREEN)✓ JWT_SECRET randomised$(RESET)"
	@echo "$(YELLOW)  Secrets written to .env — keep this file out of version control$(RESET)"

# ── SSL CERTIFICATES ────────────────────────────────────────
# Generates a self-signed certificate for local HTTPS development.
ssl-certs:
	@mkdir -p nginx/ssl
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

dev-frontend:
	cd frontend && npm run dev

# ── SHELLS ──────────────────────────────────────────────────
shell-backend:
	$(DC) exec backend sh

shell-frontend:
	$(DC) exec frontend sh

shell-db:
	$(DC) exec postgres psql -U $${DB_USER:-alpacaparty} -d $${DB_NAME:-alpacaparty}

# ── CLEANUP ─────────────────────────────────────────────────
clean:
	$(DC) down --rmi all --remove-orphans
	$(DC_PROD) down --rmi all --remove-orphans

clean-volumes:
	$(DC) down --rmi all --volumes --remove-orphans
	$(DC_PROD) down --rmi all --volumes --remove-orphans

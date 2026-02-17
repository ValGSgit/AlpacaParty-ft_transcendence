# ============================================================================
# CLEANSCENDENCE — Makefile
# @owner   ValGSgit
# @issue   https://github.com/ValGSgit/Cleanscendence/issues/6
# ============================================================================

# ── Colours ─────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# ── Docker ──────────────────────────────────────────────────
DC := docker compose

.DEFAULT_GOAL := help
.PHONY: help up down build logs restart ps \
        clean clean-volumes \
        install install-backend install-frontend \
        dev dev-backend dev-frontend \
        shell-backend shell-frontend shell-db

# ── HELP ────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(CYAN)========== Cleanscendence ===========$(RESET)"
	@echo ""
	@echo "$(YELLOW)Docker$(RESET)"
	@echo "  $(GREEN)make up$(RESET)             Start all containers"
	@echo "  $(GREEN)make down$(RESET)           Stop all containers"
	@echo "  $(GREEN)make build$(RESET)          Build / rebuild images"
	@echo "  $(GREEN)make logs$(RESET)           Tail container logs"
	@echo "  $(GREEN)make restart$(RESET)        Restart containers"
	@echo "  $(GREEN)make ps$(RESET)             Show container status"
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
	@echo "$(YELLOW)Cleanup$(RESET)"
	@echo "  $(GREEN)make clean$(RESET)          Stop containers & remove images"
	@echo "  $(GREEN)make clean-volumes$(RESET)  Also remove persistent volumes"
	@echo ""

# ── DOCKER ──────────────────────────────────────────────────
up:
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

dev-frontend:
	cd frontend && npm run dev

# ── SHELLS ──────────────────────────────────────────────────
shell-backend:
	docker exec -it cleanscendence_backend  sh

shell-frontend:
	docker exec -it cleanscendence_frontend sh

shell-db:
	docker exec -it cleanscendence_db psql -U $${DB_USER:-cleanscendence} -d $${DB_NAME:-cleanscendence}

# ── CLEANUP ─────────────────────────────────────────────────
clean:
	$(DC) down --rmi local --remove-orphans

clean-volumes:
	$(DC) down --rmi local --volumes --remove-orphans

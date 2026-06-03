# ============================================================================
# ALPACAPARTY — Makefile
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
        shell-backend shell-frontend shell-db shell-nginx \
        prisma_studio backend-cmd \
        test backend-test backend-test-watch e2e prod-e2e test-local \
        stress-test stress-test-build stress-test-live \
        seed-example seed-example-reset prod-seed-example prod-seed-example-reset \
        seed-live seed-live-reset prod-seed-live prod-seed-live-reset \
        demo-list demo-frameworks demo-realtime demo-user-interaction \
        demo-public-api demo-orm demo-notifications demo-uploads \
        demo-user-mgmt demo-stats demo-llm \
        demo-spit-royale demo-alpaca-road demo-three demo-customization demo-gamification \
        demo-https \
        clean clean-volumes fclean deep-clean

# ── HELP ────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(CYAN)$(BOLD)========== AlpacaParty ===========$(RESET)"
	@echo ""
	@echo "$(BOLD)$(BLUE)EVALUATION DEMOS$(RESET) $(YELLOW)— one target per claimed module$(RESET)"
	@echo "  $(GREEN)make demo-list$(RESET)              Show every demo target with a one-liner"
	@echo "  $(GREEN)make demo-<name>$(RESET)            Run an individual module demo"
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
	@echo "  $(GREEN)make prod-up$(RESET)         Bring up the full prod stack"
	@echo "  $(GREEN)make prod-down$(RESET)       Stop prod containers"
	@echo "  $(GREEN)make prod-build$(RESET)      Rebuild prod images from scratch"
	@echo "  $(GREEN)make prod-logs$(RESET)       Tail prod logs"
	@echo "  $(GREEN)make prod-status$(RESET)     One-shot health snapshot of every prod service"
	@echo "  $(GREEN)make generate-secrets$(RESET)  Rotate DB + JWT + API secrets in .env"
	@echo "  $(GREEN)make ssl-certs$(RESET)         Generate self-signed SSL cert"
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
	@echo ""
	@echo "$(BOLD)$(YELLOW)Testing$(RESET)"
	@echo "  $(GREEN)make test$(RESET)            Backend unit tests in a container"
	@echo "  $(GREEN)make test-local$(RESET)      Backend unit tests on host node"
	@echo "  $(GREEN)make e2e$(RESET)             Playwright against dev stack"
	@echo "  $(GREEN)make prod-e2e$(RESET)        Playwright against prod stack"
	@echo "  $(GREEN)make stress-test$(RESET)     Full stress + security stress run"
	@echo ""
	@echo "$(BOLD)$(YELLOW)Database$(RESET)"
	@echo "  $(GREEN)make seed-live$(RESET)              Seed sample users / posts / games (dev)"
	@echo "  $(GREEN)make seed-live-reset$(RESET)        Wipe and reseed sample data (dev)"
	@echo "  $(GREEN)make prod-seed-live$(RESET)         Seed sample data (prod)"
	@echo "  $(GREEN)make prod-seed-live-reset$(RESET)   Wipe and reseed sample data (prod)"
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

prod-status:
	@$(DC_PROD) ps --format 'table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}'

# ── SETUP ───────────────────────────────────────────────────
create-dirs:
	@mkdir -p backend/node_modules
	@mkdir -p frontend/node_modules

# ── SECRETS ─────────────────────────────────────────────────
# Generates .env from .env.example with cryptographically random secrets.
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
		DB_URL="postgresql://$$DB_USER:$$DB_PASS@postgres:5432/$$DB_NAME?schema=public" && \
		if grep -q '^DATABASE_URL=' .env; then \
			$(SED_I) "s|^DATABASE_URL=.*|DATABASE_URL=$$DB_URL|" .env; \
		else \
			printf '\nDATABASE_URL=%s\n' "$$DB_URL" >> .env; \
		fi && \
		echo "$(GREEN)✓ DB_PASSWORD + DATABASE_URL randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_SECRET=.*|JWT_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_REFRESH_SECRET randomised$(RESET)"
	@JWT=$$(openssl rand -hex 40) && \
		$(SED_I) "s|^JWT_PUBLIC_API_SECRET=.*|JWT_PUBLIC_API_SECRET=$$JWT|" .env && \
		echo "$(GREEN)✓ JWT_PUBLIC_API_SECRET randomised$(RESET)"
	@API_KEY=$$(openssl rand -hex 32) && \
		if grep -q '^API_KEYS=' .env; then \
			$(SED_I) "s|^API_KEYS=.*|API_KEYS=$$API_KEY|" .env; \
		else \
			printf '\nAPI_KEYS=%s\n' "$$API_KEY" >> .env; \
		fi && \
		echo "$(GREEN)✓ API_KEYS randomised$(RESET)"
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
			-addext "subjectAltName=DNS:localhost,DNS:frontend,DNS:backend,DNS:nginx,IP:127.0.0.1,IP:$$IP,DNS:$$IP.nip.io" \
			2>/dev/null && \
		echo "$(GREEN)✓ Self-signed certificate generated in ssl/$(RESET)"; \
	else \
		echo "$(YELLOW)  Certificate already exists — skipping$(RESET)"; \
	fi
	@chmod +rw ssl/key.pem
	@chmod +rw ssl/cert.pem

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

# The E2E suite registers a fresh user in nearly every test from a single IP.
# The production auth limiters (50 registrations / 10 failed logins per 15 min)
# would trip partway through the run and fail the later tests. Relax them for
# the whole prod stack the suite runs against — these exported, target-specific
# vars propagate to the prerequisite chain (prod-seed-live → prod-up) so the
# backend container comes up with the relaxed caps. Real production leaves the
# vars unset and keeps the strict defaults.
prod-e2e: export AUTH_RATE_LIMIT_MAX := 100000
prod-e2e: export LOGIN_RATE_LIMIT_MAX := 100000
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

test-local:
	cd backend && npm test

# ── STRESS & SECURITY TESTS ─────────────────────────────────
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

seed-live: seed-example
seed-live-reset: seed-example-reset
prod-seed-live: prod-seed-example
prod-seed-live-reset: prod-seed-example-reset

# ============================================================================
# DEMO TARGETS — one per module on the evaluation checklist.
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
	@echo "  $(BOLD)AI$(RESET)"
	@echo "    $(GREEN)demo-llm$(RESET)               Help-desk chat → Groq round-trip (Major, 2pts)"
	@echo ""
	@echo "  $(BOLD)Gaming$(RESET)"
	@echo "    $(GREEN)demo-spit-royale$(RESET)       First game live (Major, 2pts)"
	@echo "    $(GREEN)demo-alpaca-road$(RESET)       Second game + matchmaking (Major, 2pts)"
	@echo "    $(GREEN)demo-three$(RESET)             3D farm world (Major, 2pts)"
	@echo "    $(GREEN)demo-customization$(RESET)     Power-ups + maps + settings (Minor, 1pt)"
	@echo "    $(GREEN)demo-gamification$(RESET)      Achievements + XP + daily challenges (Minor, 1pt)"
	@echo ""
	@echo "  $(BOLD)Mandatory$(RESET)"
	@echo "    $(GREEN)demo-https$(RESET)             Curl https://localhost — TLS termination at nginx"
	@echo ""

demo-frameworks:
	@echo "$(CYAN)$(BOLD)Module: Web — frontend + backend frameworks (Major, 2pts)$(RESET)"
	@echo "  Frontend: $(YELLOW)Vue 3 + Vite + Pinia + Vue Router$(RESET)"
	@echo "  Backend:  $(YELLOW)Express.js (Node 24, ESM)$(RESET)"
	@grep -E '"vue":|"express":|"vue-router":|"pinia":|"socket.io":' frontend/package.json backend/package.json 2>/dev/null | sed 's/^/    /'

demo-realtime:
	@echo "$(CYAN)$(BOLD)Module: Web — real-time via WebSockets (Major, 2pts)$(RESET)"
	@echo "  Open two tabs, log in as different users, send a DM. The receiver sees it"
	@echo "  arrive without a refresh."
	@echo ""
	$(DC) logs --tail=30 backend | grep -i 'socket\|presence\|dm:' || \
	  echo "$(YELLOW)  (no socket activity yet — connect a client and try again)$(RESET)"

demo-user-interaction:
	@echo "$(CYAN)$(BOLD)Module: Web — user interaction (Major, 2pts)$(RESET)"
	@echo "  • Chat:    POST /api/chat/dm OR socket 'dm:send'"
	@echo "  • Profile: GET /api/users/:id"
	@echo "  • Friends: POST /api/friends/requests, PUT /api/friends/requests/:id/accept"

demo-public-api:
	@echo "$(CYAN)$(BOLD)Module: Web — Public API with key + rate limit (Major, 2pts)$(RESET)"
	@echo ""
	@echo "  1. Generate an API key from the UI (Profile → API tab) — save as KEY"
	@echo "  2. $(YELLOW)curl -k -H \"X-API-Key: \$$KEY\" https://localhost/api/public/users$(RESET)"
	@echo "  3. Hit 31 times in 60s → 429 (rate-limited)"
	@echo "  Docs: https://localhost/api/docs/public"

demo-orm:
	@echo "$(CYAN)$(BOLD)Module: Web — ORM (Minor, 1pt)$(RESET)"
	@echo "  Stack: Prisma + @prisma/adapter-pg"
	@echo -n "  Models in schema: "
	@grep -c '^model ' backend/prisma/schema.prisma

demo-notifications:
	@echo "$(CYAN)$(BOLD)Module: Web — Notification system (Minor, 1pt)$(RESET)"
	@echo "  Trigger a friend request → recipient sees 🔔 badge + DB row in Notification."

demo-uploads:
	@echo "$(CYAN)$(BOLD)Module: Web — File uploads (Minor, 1pt)$(RESET)"
	@echo "  Upload via Profile → avatar or:"
	@echo "    $(YELLOW)curl -k -b 'jwt_token=…' -F 'file=@me.png' https://localhost/api/uploads$(RESET)"

demo-user-mgmt:
	@echo "$(CYAN)$(BOLD)Module: User management (Major, 2pts)$(RESET)"
	@echo "  Flow: register → login → /users/me → upload avatar → add friend"

demo-stats:
	@echo "$(CYAN)$(BOLD)Module: Game statistics & match history (Minor, 1pt)$(RESET)"
	@echo "    GET /api/game/stats?gameType=spit_royale"
	@echo "    GET /api/game/history?limit=20"
	@echo "    GET /api/game/leaderboard?board=kills|obstacles|coins"

demo-llm:
	@echo "$(CYAN)$(BOLD)Module: LLM system interface (Major, 2pts)$(RESET)"
	@echo "  Open the app → bottom-right help-desk widget → ask 'how do I add a friend?'"

demo-spit-royale:
	@echo "$(CYAN)$(BOLD)Module: Web-based game — Spit Royale (Major, 2pts)$(RESET)"
	@echo "  Real-time 2-10 player arena over /minigames socket namespace."

demo-alpaca-road:
	@echo "$(CYAN)$(BOLD)Module: Add another game with matchmaking — Alpaca Road (Major, 2pts)$(RESET)"
	@echo "  Up to 4 players. Independent leaderboard. Matchmaking via MatchManager."

demo-three:
	@echo "$(CYAN)$(BOLD)Module: Advanced 3D graphics (Major, 2pts)$(RESET)"
	@echo "  Open the app → 'AlpacaFarm' tab → custom Three.js world."

demo-customization:
	@echo "$(CYAN)$(BOLD)Module: Game customization (Minor, 1pt)$(RESET)"
	@echo "  Power-ups, map variants, per-match settings — visible in the lobby."

demo-gamification:
	@echo "$(CYAN)$(BOLD)Module: Gamification (Minor, 1pt) — 5 of 6 mechanics$(RESET)"
	@echo "  Achievements · Leaderboards · XP/Level · Daily challenges · Rewards"

demo-https:
	@echo "$(CYAN)$(BOLD)Mandatory: HTTPS everywhere$(RESET)"
	@curl -k -sI https://localhost/ | head -5 | sed 's/^/  /'

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

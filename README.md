*This project has been created as part of the 42 curriculum by ValGSgit, DavidPoetsch, fankahou, LukasStefanek.*

# AlpacaParty

> A social gaming web application where users raise virtual alpacas in a 3D farm, play two real-time multiplayer games, chat with friends, and earn achievements — built with Vue 3, Express.js, PostgreSQL, Socket.IO, ModSecurity, and HashiCorp Vault, deployed via Docker Compose.

---

## Description

**AlpacaParty** is a full-stack social gaming platform that combines a 3D alpaca farm (powered by Three.js) with two real-time multiplayer games (**Spit Royale** and **Alpaca Road**), a social feed, direct messaging, and a friends system. An AI-powered help desk built on the Groq LLM API answers user questions inside the app. Production runs behind nginx + ModSecurity WAF, with HashiCorp Vault holding all production secrets.

### Key Features

- **3D Alpaca Farm** — Three.js immersive farm with alpaca customization, in-world shop, building, and cloud saves
- **Spit Royale** — Server-authoritative free-for-all arena, up to 10 players in a single room; 0.5 s spit cooldown and 12 m range enforced on the server. Last alpaca standing wins.
- **Alpaca Road** — Server-authoritative obstacle-dodging survival game across up to 4 lanes; survive longer to climb the level.
- **Real-time Direct Messaging** — Socket.IO 1-to-1 DMs with typing indicators, read receipts, persistent history, and in-chat game invites; block / unblock.
- **Social Feed** — Posts with image uploads; likes, comments; public/private visibility.
- **Friends & Presence** — Send/accept/decline/cancel requests; live online indicator.
- **AI Help Desk ("Paca")** — Floating chat widget; backend proxies to Groq with a system prompt that knows AlpacaParty's features and links.
- **Gamification** — XP/level, 15 seeded achievements, daily challenges, in-game coins, three leaderboards (kills, obstacles, coins).
- **Admin Panel** — Role-based access control (admin / superadmin), dashboard stats, user management (ban / role / delete).
- **Public API** — 6 RESTful endpoints under `/api/public/*` with `X-API-Key` (`ap_` prefix) auth, 30 req/min rate limit, Swagger UI at `/api/docs/public` (also embedded in the in-app `/docs` page).
- **HTTPS Everywhere** — Self-signed TLS in dev, nginx + ModSecurity (OWASP CRS 3.3.9) in prod; HSTS, CSP, X-Frame-Options enforced at the nginx layer.
- **Secret Management** — HashiCorp Vault auto-init seeds the DB password, JWT secret, and Groq keys at startup; the backend reads them into memory — no plaintext on disk.
- **GDPR Compliance** — Self-service data export (JSON/CSV/XML) and account deletion from Profile → Settings.
- **Privacy Policy & Terms of Service** — Project-specific copy (no boilerplate), linked from every page footer.

---

## Team Information

| Member | Role(s) | Responsibilities |
|--------|---------|------------------|
| **ValGSgit** | Product Owner / Project Manager / Developer | Product vision, backlog & sprint planning, Docker & Makefile infrastructure, backend API architecture, JWT auth, public API, Vault integration, AI help desk, gamification engine, Spit Royale + Alpaca Road servers |
| **DavidPoetsch** | Technical Lead / Developer | nginx reverse proxy + HTTPS, ModSecurity WAF + OWASP CRS, backend controllers, PostgreSQL schema design & query optimization |
| **fankahou** | Developer | Frontend views & components, Three.js 3D world rendering, farm/world assets, UI/UX, CSS design system |
| **LukasStefanek** | Developer | Three.js core engine (camera, alpaca models, animations, interaction), Messages.vue real-time chat UI, Login/Register flows, mini-game clients |

---

## Project Management

### How We Organized Work

- **Task Distribution by domain** — Backend & infrastructure (ValGSgit, DavidPoetsch); frontend & 3D game (fankahou, LukasStefanek). Each developer owns a clear set of files; cross-domain features (e.g. real-time DMs) were paired.
- **GitHub Issues** — Every feature was tracked as a GitHub issue with clear acceptance criteria. See [ISSUES.md](ISSUES.md) for the running log.
- **Weekly syncs** — One team meeting per week to review progress, resolve blockers, and plan the next sprint.
- **Code reviews** — Non-trivial PRs were reviewed by at least one other team member before merge.
- **Communication** — Discord server for daily async chat and quick decisions; GitHub issue threads for design discussions.

### Tools Used

- **GitHub** — repository, issues, pull requests, code review
- **Discord** — daily team communication
- **Docker Compose / Makefile** — reproducible local + production deployments

---

## Technical Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend framework** | Vue 3 (Composition API) + Vite + Vue Router + Pinia | Modern, reactive, excellent DX, mature ecosystem |
| **Styling** | Custom design system (CSS custom properties + scoped CSS, organised under `frontend/src/styles/`) | Consistent dark theme, no framework bloat, full control |
| **3D engine** | Three.js | Industry-standard WebGL library |
| **Backend framework** | Node.js 20 (ESM) + Express.js | Lightweight, easy Socket.IO integration, native `--watch` in dev |
| **Real-time** | Socket.IO (2 namespaces: `/` for presence + DMs + post broadcasts + notifications, `/minigames` for match lobbies via `MatchManager`) | Reliable WebSocket transport with automatic reconnection and rooms |
| **Database** | PostgreSQL 16 | Relational integrity + JSONB for the flexible alpaca-farm save data |
| **ORM** | Prisma (`@prisma/adapter-pg`) | Type-safe DB access across 22 models with managed migrations |
| **Auth** | JWT (access + refresh in HTTP-only cookies) + bcrypt | Standard secure pattern for email/password authentication |
| **AI** | Groq LLM API — server-side proxy | Fast completions for the in-app "Paca" help desk; key never exposed to the browser |
| **Reverse proxy + WAF** | nginx + ModSecurity (OWASP CRS 3.3.9) | HTTPS termination, WS upgrade, attack filtering |
| **Secret management** | HashiCorp Vault (file backend, auto-init + auto-unseal) | All production secrets fetched at backend startup; no plaintext on disk |
| **Containerization** | Docker Compose (`make up` / `make prod-up`) | Single-command deployment |
| **API docs** | Swagger UI (OpenAPI 3) at `/api/docs/public`, embedded in the `/docs` frontend page | Interactive documentation for the public API + architecture map |

---

## Database Schema

PostgreSQL with **22 Prisma models**, organized around users, social interactions, content, gaming, and compliance.

### Core Tables and Relationships

```
┌───────────────────────────────────────────────────────────────┐
│                            User                               │
│  id · username · email · avatar · bio · status · isOnline     │
│  isPublic · lastSeen · createdAt                              │
└───────┬───────────────────────────────────────────────────────┘
        │ 1:1
        ├─► UserAuth        (passwordHash, role)
        ├─► UserStats       (xp, level)
        ├─► UserSettings    (privacy + per-user prefs)
        ├─► PublicApi       (hashed apiKey, lastRotated)        1:0..1
        ├─► AlpacaFarm      (items, alpacas, coins, upgrades — JSONB)
        │
        │ 1:N
        ├─► Friend, FriendRequest, BlockedUser   (social graph)
        ├─► Message                              (DMs, sender ↔ receiver)
        ├─► Post — PostLike, Comment
        ├─► File                                 (uploads metadata)
        ├─► Notification
        ├─► Game (player1Id · player2Id · winnerId, gameType, gameData JSON)
        ├─► GameStat (per user × gameType: wins · losses · draws · kills · obstacles)
        ├─► UserAchievement → Achievement (15 seeded keys)
        ├─► UserDailyChallenge → DailyChallenge
        └─► DataRequest                          (GDPR export/delete workflow)
```

### Key Fields and Data Types

| Model | Key fields | Notes |
|-------|------------|-------|
| `User` | id, username, email, avatar, bio, status, isOnline, lastSeen, isPublic | Core identity + profile |
| `UserAuth` | passwordHash (bcrypt), role | Auth split from profile; `role` drives admin gating |
| `UserStats` | xp, level | Gamification state |
| `PublicApi` | apiKey (hashed `ap_<32-char hex>`), lastRotated | Per-user public-API key |
| `Game` | player1Id, player2Id, winnerId, scores, gameType (`spit_royale` / `alpaca_road`), gameData (JSON) | Match record (2-player matches only) |
| `GameStat` | userId × gameType unique, wins, losses, draws, kills, obstacles | Aggregate stats — no ELO; leaderboards rank by kills / obstacles / coins |
| `AlpacaFarm` | userId unique, items/alpacas/upgrades (JSONB), coins | Full 3D farm save |
| `Achievement` / `UserAchievement` | key (`first_login`, `first_win`, `sharpshooter`, `road_warrior`, `level_10`, …), xpReward / unlockedAt | 15 seeded achievements |
| `DailyChallenge` / `UserDailyChallenge` | activeDate / completed, completedAt | Rotating daily challenges |
| `Post`, `PostLike`, `Comment` | authorId, content, imageUrl, isPublic | Social content graph |
| `DataRequest` | type (`export`/`delete`), status, format (`json`/`csv`/`xml`) | GDPR workflow |
| `File` | uploaderId, originalName, storedName, mimeType, sizeBytes | Secure upload metadata |

---

## Features List

| Feature | Description | Team Member(s) |
|---------|-------------|----------------|
| User Registration & Login | Email/password (bcrypt), JWT access + refresh in HTTP-only cookies | ValGSgit, DavidPoetsch |
| User Profiles | Editable username, bio, status, avatar; XP / level, online indicator, public/private toggle | ValGSgit, fankahou |
| Friends System | Send / accept / decline / cancel requests; online status; block / unblock | ValGSgit, fankahou |
| Direct Messaging | Real-time 1-to-1 messaging via Socket.IO; typing indicators; read receipts; persistent history; in-chat game invites | ValGSgit, LukasStefanek |
| Social Feed | Posts with image uploads; likes, comments; public/private | ValGSgit, fankahou |
| 3D Alpaca Farm | Three.js farm world: alpaca customization, in-world shop, building, cloud save (JSONB) | fankahou, LukasStefanek |
| Spit Royale (Game 1) | Real-time free-for-all arena (up to 10 players); server-side cooldown/range enforcement; last-alpaca-standing win | ValGSgit, LukasStefanek |
| Alpaca Road (Game 2) | Real-time obstacle-dodging survival (up to 4 lanes); independent stats and leaderboard | ValGSgit, LukasStefanek |
| Gamification | XP / level / coins, 15 achievements, daily challenges, three leaderboards (kills / obstacles / coins) | ValGSgit |
| Admin Panel | Role-based access control (admin / superadmin), dashboard stats, user management | ValGSgit |
| AI Help Desk | Floating "Paca" widget; backend proxies user messages + system prompt to Groq LLM API; per-user rate-limited | ValGSgit |
| Notifications | Real-time notifications for friend requests, messages, likes, comments, achievements, game invites | ValGSgit |
| Public API | 6 endpoints under `/api/public/*` with `X-API-Key` (`ap_…`) auth, 30 req/min, Swagger UI at `/api/docs/public` | ValGSgit |
| File Uploads | Multi-type, MIME whitelist, 10 MB cap, hashed filenames, preview, delete | ValGSgit, DavidPoetsch |
| Cybersecurity (WAF + Vault) | nginx + ModSecurity (OWASP CRS), Vault auto-init / unseal / seed; backend reads secrets at startup | ValGSgit, DavidPoetsch |
| HTTPS | Self-signed TLS in dev, HSTS, security headers (CSP, X-Frame-Options) | DavidPoetsch, ValGSgit |
| Privacy Policy / Terms | Project-specific copy (Help, Privacy, Terms) reflecting the real feature set; linked from every page footer | ValGSgit |
| GDPR Data Management | Export (JSON/CSV/XML), account deletion (immediate via `DELETE /users/me`, or queued via `POST /users/me/delete-request`) | ValGSgit |
| Settings | Profile edit, password change, privacy toggle, API key management, data export, account deletion — all under `/profile?tab=settings` | ValGSgit, fankahou |

---

## Modules

### Module Point Calculation

| # | Module | Category | Type | Points | Status | Team Member(s) |
|---|--------|----------|------|--------|--------|----------------|
| 1 | **Use a framework for both frontend and backend** (Vue 3 + Express.js) | Web | Major | **2** | ✅ | All |
| 2 | **Real-time features (WebSockets)** — Socket.IO: presence, DMs, game state, notifications | Web | Major | **2** | ✅ | ValGSgit, DavidPoetsch |
| 3 | **User interaction** — DMs, profile pages, friends system | Web | Major | **2** | ✅ | All |
| 4 | **Public API** — 6 RESTful endpoints, `X-API-Key` auth, rate limit, Swagger UI | Web | Major | **2** | ✅ | ValGSgit |
| 5 | **ORM** — Prisma across 22 models | Web | Minor | **1** | ✅ | ValGSgit |
| 6 | **Notification system** — real-time create/update/delete notifications | Web | Minor | **1** | ✅ | ValGSgit |
| 7 | **File upload and management** — multi-type, validation, secure storage, preview, delete | Web | Minor | **1** | ✅ | ValGSgit, DavidPoetsch |
| 8 | **Standard user management** — profile edit, avatar upload, friends, online status | User Mgmt | Major | **2** | ✅ | ValGSgit, fankahou |
| 10 | **Game statistics & match history** — `/game/stats`, `/game/history`, leaderboards, achievements | User Mgmt | Minor | **1** | ✅ | ValGSgit |
| 11 | **LLM system interface** — Groq-backed help desk; backend rate-limited, system-prompted | AI | Major | **2** | ✅ | ValGSgit |
| 12 | **WAF/ModSecurity hardened + HashiCorp Vault** — strict ModSecurity with OWASP CRS; Vault auto-init/unseal seeds DB password, JWT secret, and Groq keys | Cybersecurity | Major | **2** | ✅ | ValGSgit, DavidPoetsch |
| 13 | **Web-based game** — Spit Royale: real-time multiplayer arena with clear win/loss rules | Gaming | Major | **2** | ✅ | ValGSgit, LukasStefanek |
| 14 | **Add another game** — Alpaca Road: second distinct game with independent history + lobbies via `MatchManager` | Gaming | Major | **2** | ✅ | ValGSgit, LukasStefanek |
| 15 | **Advanced 3D graphics (Three.js)** — immersive farm world, lighting, cameras, animations | Gaming | Major | **2** | ✅ | fankahou, LukasStefanek |
| 16 | **Game customization** — alpaca colour, in-world shop items, customizable farm layouts | Gaming | Minor | **1** | ✅ | fankahou, LukasStefanek |
| 17 | **Gamification** — achievements, leaderboards, XP/level, daily challenges, persistent in DB, visual feedback | Gaming | Minor | **1** | ✅ | ValGSgit |

### **Total: 27 points** (14 required + bonus headroom)

10 Major × 2 + 7 Minor × 1 = 27 points. The 14-point mandatory bar is met by any subset of half these modules; the surplus is intended as headroom in case any module is contested during peer evaluation. Per the subject, the bonus part is capped at 5 additional points beyond the required 14.

> The data-export + deletion features (`GET /api/users/me/export`,
> `POST /api/users/me/delete-request`, `DataRequest` workflow) still ship
> as part of the platform's compliance posture, but the team does **not**
> claim the GDPR Minor module: the subject's "Confirmation emails for
> data operations" bullet is not currently implemented, so the module
> would not survive a literal evaluation.

### Module Implementation Details

1. **Frontend + Backend Frameworks** — Vue 3 + Vite + Pinia + Vue Router on the client; Express.js with modular controller/service/route architecture on the server.
2. **Real-time features** — Socket.IO with two namespaces. The `/` namespace handles presence, DMs, notifications, and post broadcasts. The `/minigames` namespace hosts `MatchManager`, which dispatches to `SpitRoyalMatch` and `AlpacaRoadMatch` instances per match room (each running its own ~33 ms tick loop). JWT cookies are validated by `socketAuthMiddleware` on every namespace.
3. **User interaction** — Direct messaging, profile pages with stats, friends with online presence, block / unblock.
4. **Public API** — `/api/public/*` with 6 endpoints (`GET /users`, `GET /users/:id`, `GET /posts`, `POST /posts`, `PUT /posts/:id`, `DELETE /posts/:id`). Authenticated by `X-API-Key` (keys prefixed `ap_` followed by a 32-char hex string), rate-limited per key (30 req/min). Plus `GET /api/public/` returning a self-describing endpoint listing. Interactive Swagger UI at `/api/docs/public`, also embedded in the in-app `/docs` page alongside an architecture map.
5. **ORM** — Prisma + `@prisma/adapter-pg` covers all 22 models with full type safety and migrations.
6. **Notification system** — Notifications are inserted on friend-request CRUD, post likes, comments, achievement unlocks, and game invites; pushed in real time over Socket.IO and persisted in the `Notification` table.
7. **File upload** — `multer` accepts images & documents under a MIME whitelist; 10 MB cap; hashed stored names; per-user listing; uploader-only delete; image preview; non-image files require auth to download.
8. **Standard user management** — Editable profile (username, email, bio, status, avatar). Default avatar served when none uploaded. Friends with real-time presence. Profile page shows level, XP progress, achievements, stats.
10. **Game statistics & match history** — `GET /api/game/stats`, `GET /api/game/history`, `GET /api/game/leaderboard?board=kills|obstacles|coins`, `GET /api/game/achievements`, `GET /api/game/challenges` — backed by `GameStat` (per game type) and `Game` (match records).
11. **LLM system interface** — `POST /api/helpdesk/chat` proxies user messages to Groq's LLM API. The backend keeps the API keys (rotating across multiple keys), injects a system prompt that explains AlpacaParty's features, applies a per-user rate limiter, and streams completions back to the floating `HelpDeskChat.vue` widget.
12. **WAF + Vault** — `nginx_prod` runs ModSecurity with OWASP CRS 3.3.9 rules. Production secrets (DB password, JWT secret, Groq keys) live in HashiCorp Vault. `vault-init` is a one-shot service that initializes Vault on first boot, writes the unseal key + service token to a Docker volume, seeds secrets, then exits. The backend reads `VAULT_TOKEN` at startup and pulls secrets into memory — no plaintext on disk in app containers.
13. **Web-based game (Spit Royale)** — Real-time arena game over Socket.IO (`/minigames` namespace, dispatched by `MatchManager` to a `SpitRoyalMatch` instance per room). Free-for-all up to **10 players**; clear win condition (last alpaca standing). The server enforces a 500 ms spit cooldown, a 12 m maximum spit range, and a per-input movement-speed clamp — every `spit_hit` outside those windows is silently ignored.
14. **Add another game (Alpaca Road)** — Second distinct game over Socket.IO (`/minigames` namespace). `MatchManager` pairs players into lobbies up to **4 lanes** and instantiates an `AlpacaRoadMatch`, running its own tick loop. Stats are tracked under `gameType = "alpaca_road"` so leaderboards and history are independent of Spit Royale.
15. **Advanced 3D graphics** — Three.js scene graph with custom lighting, multiple cameras, alpaca model rigging + animation, and an interactive farm world with shop, customization, and editing.
16. **Game customization** — The farm world exposes alpaca colour customization, an in-world shop, and persistent per-user save data (`AlpacaFarm` JSONB). Match rooms expose customizable settings before the game starts.
17. **Gamification** — XP awarded for wins (with performance bonuses), losses, posts, and challenges. Auto level-up. 15 seeded achievements including `first_login`, `first_win`, `win_streak_5`, `sharpshooter` (10 Spit Royale wins), `road_warrior` (5 Alpaca Road stages), `social_butterfly`, `chatterbox`, `coin_hoarder`, `level_10`, `top_player`, etc. Daily challenges rotate and persist completions. Three leaderboards: kills (Spit Royale), obstacles (Alpaca Road), and coins. Notifications and progress bars provide visual feedback.

---

## Individual Contributions

### ValGSgit — Product Owner / Project Manager / Developer
- **Infrastructure**: Docker Compose (dev + prod), Makefile targets, `.env.example`, SSL cert generation script
- **Backend core**: Express server bootstrap, configuration system, middleware stack (helmet, cookie-parser, CORS, rate limiters, `authenticate`, `optionalAuth`, `requireApiKey`, `requireAdmin`, error handler)
- **Auth**: JWT access + refresh in HTTP-only cookies, bcrypt hashing with constant-time compare, admin JWT token generation
- **Database**: Prisma schema (22 models), migrations, seed data (including 15 achievements)
- **API surface**: All controllers (auth, users, friends, chat, posts, comments, game, notifications, uploads, public API, helpdesk, admin)
- **Services**: Gamification engine, NotificationService, dataExportService (JSON / CSV / XML), uploadService, adminAuthService, `socketService` for the `/` namespace, `MatchManager` on the `/minigames` namespace dispatching `SpitRoyalMatch` and `AlpacaRoadMatch`
- **Admin Panel**: Role-based access control (admin / superadmin), `adminController`, `adminAuthService`, `admin.js` middleware, admin route definitions, dashboard statistics
- **AI**: Groq LLM proxy (`/helpdesk`) with key rotation and rate limiting; floating `HelpDeskChat.vue` widget
- **Cybersecurity**: HashiCorp Vault auto-init + auto-unseal + secret seeding; ModSecurity WAF tuned for the API; API-key session validation
- **Frontend**: `Feed.vue`, `Profile.vue`, settings page, public-API-key management UI, `ApiDocs.vue`, `AdminPanel.vue`, `AdminLogin.vue`, notifications, `Help.vue`, `PrivacyPolicy.vue`, `TermsOfService.vue`, GDPR export + delete-request flows

### DavidPoetsch — Technical Lead / Developer
- **nginx**: Reverse-proxy config for dev + prod, HTTPS termination, WS upgrade for Socket.IO, security headers (HSTS, CSP, X-Frame-Options)
- **WAF**: ModSecurity build + OWASP CRS 3.3.9 ruleset tuning
- **Backend**: Controller implementations, route definitions, query optimization
- **Database**: Schema refinements, index strategy, data integrity constraints

### fankahou — Developer
- **3D world**: Three.js farm environment, world rendering, asset management (models + textures)
- **Game UI**: Shop, HUD overlay, edit mode, lighting controls
- **Frontend**: `Friends.vue`, parts of `Profile.vue`, CSS design system, dark theme & responsive layouts

### LukasStefanek — Developer
- **3D engine**: Three.js core (camera system, alpaca models + animations), interaction mechanics
- **Game logic**: Alpaca customization, farm building, coin economy, cloud save/load over Socket.IO
- **Game clients**: Spit Royale + Alpaca Road client code under `frontend/src/games/mini_games/`
- **Frontend**: `Login.vue`, `Register.vue`, `Messages.vue` (DM client with Socket.IO integration, typing indicators, read receipts, infinite scroll)

---

## Instructions

### Prerequisites

- **Docker** (≥ v20) and **Docker Compose** (≥ v2)
- **Git**
- **OpenSSL** (for self-signed cert generation in dev)
- A modern browser (latest stable Google Chrome recommended)

### Setup and Run (development)

```bash
# 1. Clone
git clone https://github.com/ValGSgit/AlpacaParty.git
cd AlpacaParty

# 2. Create environment file
cp .env.example .env
# Edit .env: set DB_PASSWORD, JWT_SECRET; optionally GROQ_API_KEYS

# 3. (Optional) Generate fresh secrets
make generate-secrets

# 4. Build & start (auto-generates SSL cert)
make build && make up

# 5. Open
# https://localhost:8443  (accept the self-signed cert warning)
```

### Production Deployment

```bash
make prod-build && make prod-up
```

Production additionally starts the `vault` and `vault-init` services. `vault-init` initializes Vault on first boot, writes the unseal key + service token to the `vault_keys` Docker volume, and seeds all secrets. The backend reads `VAULT_TOKEN` from the volume at startup and pulls every secret into memory.

### Local Development (without Docker)

```bash
make install         # install backend + frontend deps
make dev             # backend on :3000, frontend on :5173
```

### Environment Variables

See [.env.example](.env.example) for the full list. Highlights:

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password (dev) — overridden by Vault in prod |
| `JWT_SECRET` | JWT signing secret — overridden by Vault in prod |
| `VITE_API_URL` | Frontend API base path (default `/api`) |
| `GROQ_API_KEYS` | Comma-separated Groq keys for the AI help desk |
| `API_KEYS` | Default public-API keys for service-level callers |
| `AUTH_RATE_LIMIT_MAX` | Auth-route rate-limit cap — bumped by `make prod-e2e` for tests |

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (HTTPS / WSS)                 │
│                  https://localhost:8443                  │
└────────────────────────┬─────────────────────────────────┘
                         │
                  ┌──────▼──────┐
                  │    nginx    │ ← HTTPS, ModSecurity WAF,
                  │  + ModSec   │   gzip, WS upgrade, headers
                  └──┬───────┬──┘
            /api/*   │       │   /*
       /socket.io/   │       │
                     │       │
              ┌──────▼─┐  ┌──▼───────┐
              │ backend│  │ frontend │
              │Express │  │ Vue 3    │
              │+SocketIO│ │ (Vite)   │
              │  :3000 │  │  :5173   │
              └──┬─────┘  └──────────┘
                 │
         ┌───────┼────────┐
         ▼       ▼        ▼
   ┌────────┐ ┌──────┐ ┌─────────┐
   │Postgres│ │Vault │ │Groq API │
   │  :5432 │ │:8200 │ │ (ext.)  │
   └────────┘ └──────┘ └─────────┘
```

### Production Services

| Service | Container | Purpose |
|---------|-----------|---------|
| `nginx` | `alpacaparty_nginx` | Reverse proxy, HTTPS, ModSecurity WAF |
| `backend` | `alpacaparty_backend` | Express + Socket.IO, port 3000 |
| `frontend` | `alpacaparty_frontend` | Vite-built Vue 3 SPA |
| `postgres` | `alpacaparty_db_prod` | PostgreSQL 16 |
| `vault` | `alpacaparty_vault` | HashiCorp Vault (secret store) |
| `vault-init` | `alpacaparty_vault_init` | One-shot init / unseal / seed, then exits |

For an interactive system map (request pipeline, route catalog, Socket.IO namespaces, secret flow, and more), open the **Architecture Map** tab on `/docs` once the app is running. The full canonical reference lives in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Resources

### Documentation & References
- [Vue 3](https://vuejs.org/guide/) · [Vue Router](https://router.vuejs.org/) · [Pinia](https://pinia.vuejs.org/)
- [Express.js](https://expressjs.com/) · [Socket.IO](https://socket.io/docs/)
- [Three.js](https://threejs.org/docs/)
- [Prisma](https://www.prisma.io/docs) · [PostgreSQL 16](https://www.postgresql.org/docs/16/)
- [HashiCorp Vault](https://developer.hashicorp.com/vault/docs)
- [ModSecurity + OWASP CRS](https://coreruleset.org/docs/)
- [nginx reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Groq API](https://console.groq.com/docs)

### AI Usage

AI tools (Claude, GitHub Copilot, ChatGPT) were used throughout the project. We treated them as a fast collaborator, not an author — every AI-assisted line was reviewed, tested, and adapted by the team. We can explain and defend any code in the project.

Specifically, AI assistance covered:

- **Frontend visual design & styling** — the look-and-feel of several pages, in particular the standalone `Help.vue` help center, `PrivacyPolicy.vue`, `TermsOfService.vue`, and parts of `NotFound.vue` / `AuthV3.vue` / `Feed.vue` were prototyped with AI (mock-ups, CSS hero treatments, scoped colour tokens, micro-animations). The structure and copy were then rewritten by the team so each page accurately describes what the project actually ships.
- **Boilerplate generation** — initial CRUD scaffolds and repetitive controller patterns
- **Configuration** — Docker Compose snippets, nginx templates, ModSecurity tuning starting points
- **Debugging** — narrowing down Socket.IO disconnect issues, CORS edge cases, JWT refresh races
- **Documentation** — README structure, OpenAPI tags
- **Tests** — test-case scaffolding and mock setup patterns
- **The in-app help desk itself** — answers to user questions are generated by Groq's LLM API, never by code we wrote

---

## Known Limitations

- SSL uses a self-signed certificate in development — production must supply a CA-signed cert.
- The Vault integration is mandatory in production; in development the backend falls back to env vars.
- Firefox / Safari / Edge: tested informally and broadly compatible, but Chrome is the primary supported browser per the subject's requirements.
- AlpacaParty matches are not matchmade — players manually join rooms via the in-game lobby. There is no ELO ranking; leaderboards rank by aggregate stats (kills, obstacles, coins).
- There is no group chat or chat-room feature — only 1-to-1 direct messages.

---

## License

See [LICENSE](LICENSE) for details.

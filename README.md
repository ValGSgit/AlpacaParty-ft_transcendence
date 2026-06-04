*This project has been created as part of the 42 curriculum by ValGSgit, DavidPoetsch, fankahou, LukasStefanek.*

# AlpacaParty

> A social gaming web application where users raise virtual alpacas in a 3D farm, play two real-time multiplayer games, chat with friends, and earn achievements — built with Vue 3, Express.js, PostgreSQL, and Socket.IO, deployed via Docker Compose.

---

## Description

**AlpacaParty** is a full-stack social gaming platform that combines a 3D alpaca farm (powered by Three.js) with two real-time multiplayer games (**Spit Royale** and **Alpaca Road**), a social feed, direct messaging, and a friends system. An AI-powered help desk built on the Groq LLM API answers user questions inside the app. Production runs behind nginx with HTTPS termination.

### Key Features

- **3D Alpaca Farm** — Three.js immersive farm with alpaca customization, in-world shop, building, and cloud saves
- **Spit Royale** — Server-authoritative free-for-all arena, up to 10 players in a single room; 0.5 s spit cooldown and 12 m range enforced on the server. Last alpaca standing wins.
- **Alpaca Road** — Server-authoritative obstacle-dodging survival game across up to 4 lanes; survive longer to climb the level.
- **Real-time Direct Messaging** — Socket.IO 1-to-1 DMs with typing indicators, read receipts, persistent history, and in-chat game invites; block / unblock.
- **Social Feed** — Posts with image uploads; likes, comments; public/private visibility.
- **Friends & Presence** — Send/accept/decline/cancel requests; live online indicator.
- **AI Help Desk ("Paca")** — Floating chat widget; backend proxies to Groq with a system prompt that knows AlpacaParty's features and links.
- **Gamification** — XP/level, 15 seeded achievements, daily challenges, in-game coins, three leaderboards (kills, obstacles, coins).
- **Public API** — 6 RESTful endpoints under `/api/public/*` with `X-API-Key` (`ap_` prefix) auth, 30 req/min rate limit, Swagger UI at `/api/docs/public`.
- **HTTPS Everywhere** — Self-signed TLS in dev, nginx HTTPS termination in prod; HSTS, CSP, X-Frame-Options enforced at the nginx layer.
- **GDPR Compliance** — Self-service data export (JSON/CSV/XML) and account deletion from Profile → Settings.
- **Privacy Policy & Terms of Service** — Project-specific copy (no boilerplate), linked from every page footer.

---

## Team Information

| Member | Role(s) | Responsibilities |
|--------|---------|------------------|
| **ValGSgit** | Product Owner / Project Manager / Developer | Product vision, backlog & sprint planning, Docker & Makefile infrastructure, backend API architecture, JWT auth, public API, AI help desk, gamification engine, Spit Royale + Alpaca Road servers |
| **DavidPoetsch** | Technical Lead / Developer | nginx reverse proxy + HTTPS, backend controllers, PostgreSQL schema design & query optimization |
| **fankahou** | Developer | Frontend views & components, Three.js 3D world rendering, farm/world assets, UI/UX, CSS design system |
| **LukasStefanek** | Developer | Three.js core engine (camera, alpaca models, animations, interaction), Messages.vue real-time chat UI, Login/Register flows, mini-game clients |

---

## Project Management

### How We Organized Work

- **Task Distribution by domain** — Backend & infrastructure (ValGSgit, DavidPoetsch); frontend & 3D game (fankahou, LukasStefanek). Each developer owns a clear set of files; cross-domain features (e.g. real-time DMs) were paired.
- **GitHub Issues** — Every feature was tracked as a GitHub issue with clear acceptance criteria.
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
| **Backend framework** | Node.js 24 (ESM) + Express.js | Lightweight, easy Socket.IO integration, native `--watch` in dev |
| **Real-time** | Socket.IO (2 namespaces: `/` for presence + DMs + post broadcasts + notifications, `/minigames` for match lobbies via `MatchManager`) | Reliable WebSocket transport with automatic reconnection and rooms |
| **Database** | PostgreSQL 16 | Relational integrity + JSONB for the flexible alpaca-farm save data |
| **ORM** | Prisma (`@prisma/adapter-pg`) | Type-safe DB access across 22 models with managed migrations |
| **Auth** | JWT (access + refresh in HTTP-only cookies) + bcrypt | Standard secure pattern for email/password authentication |
| **AI** | Groq LLM API — server-side proxy | Fast completions for the in-app "Paca" help desk; key never exposed to the browser |
| **Reverse proxy** | nginx | HTTPS termination, WS upgrade, gzip, security headers |
| **Containerization** | Docker Compose (`make`) | Single-command build + deploy |
| **API docs** | Swagger UI (OpenAPI 3) at `/api/docs/public` | Interactive documentation for the public API |

---

## Database Schema

PostgreSQL with **22 Prisma models**, organized around users, social interactions, content, and gaming.

### Core Tables and Relationships

```
┌───────────────────────────────────────────────────────────────┐
│                            User                               │
│  id · username · email · avatar · bio · status · isOnline     │
│  isPublic · lastSeen · createdAt                              │
└───────┬───────────────────────────────────────────────────────┘
        │ 1:1
        ├─► UserAuth        (passwordHash)
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
| `UserAuth` | passwordHash (bcrypt) | Auth split from profile |
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
| AI Help Desk | Floating "Paca" widget; backend proxies user messages + system prompt to Groq LLM API; per-user rate-limited | ValGSgit |
| Notifications | Real-time notifications for friend requests, messages, likes, comments, achievements, game invites | ValGSgit |
| Public API | 6 endpoints under `/api/public/*` with `X-API-Key` (`ap_…`) auth, 30 req/min, Swagger UI at `/api/docs/public` | ValGSgit |
| File Uploads | Multi-type, MIME whitelist, 10 MB cap, hashed filenames, preview, delete | ValGSgit, DavidPoetsch |
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
| 9 | **Game statistics & match history** — `/game/stats`, `/game/history`, leaderboards, achievements | User Mgmt | Minor | **1** | ✅ | ValGSgit |
| 10 | **LLM system interface** — Groq-backed help desk; backend rate-limited, system-prompted | AI | Major | **2** | ✅ | ValGSgit |
| 11 | **Web-based game** — Spit Royale: real-time multiplayer arena with clear win/loss rules | Gaming | Major | **2** | ✅ | ValGSgit, LukasStefanek |
| 12 | **Add another game** — Alpaca Road: second distinct game with independent history + lobbies via `MatchManager` | Gaming | Major | **2** | ✅ | ValGSgit, LukasStefanek |
| 13 | **Advanced 3D graphics (Three.js)** — immersive farm world, lighting, cameras, animations | Gaming | Major | **2** | ✅ | fankahou, LukasStefanek |
| 14 | **Game customization** — alpaca colour, in-world shop items, customizable farm layouts | Gaming | Minor | **1** | ✅ | fankahou, LukasStefanek |
| 15 | **Gamification** — achievements, leaderboards, XP/level, daily challenges, persistent in DB, visual feedback | Gaming | Minor | **1** | ✅ | ValGSgit |

### **Total: 25 points** (14 required + 11 headroom)

9 Major × 2 + 7 Minor × 1 = 25 points. The 14-point mandatory bar is met by any subset of half these modules; the surplus is intended as headroom in case any module is contested during peer evaluation. Per the subject, the bonus part is capped at 5 additional points beyond the required 14.

> The data-export + deletion features (`GET /api/users/me/export`,
> `POST /api/users/me/delete-request`, `DataRequest` workflow) still ship
> as part of the platform's compliance posture, but the team does **not**
> claim the GDPR Minor module: the subject's "Confirmation emails for
> data operations" bullet is not currently implemented, so the module
> would not survive a literal evaluation.

> The **Cybersecurity** Major is not claimed either. The subject bundles
> WAF/ModSecurity **and** HashiCorp Vault into a single 2-point module, and
> both halves have been removed from the project — Vault gave way to
> secrets loaded from the project-root `.env` file via Compose's `env_file`
> directive, and the WAF/ModSecurity layer has been dropped from the nginx
> image (it now runs as a plain reverse proxy).

### Module Implementation Details

1. **Frontend + Backend Frameworks** — Vue 3 + Vite + Pinia + Vue Router on the client; Express.js with modular controller/service/route architecture on the server.
2. **Real-time features** — Socket.IO with two namespaces. The `/` namespace handles presence, DMs, notifications, and post broadcasts. The `/minigames` namespace hosts `MatchManager`, which dispatches to `SpitRoyalMatch` and `AlpacaRoadMatch` instances per match room (each running its own ~33 ms tick loop). JWT cookies are validated by `socketAuthMiddleware` on every namespace.
3. **User interaction** — Direct messaging, profile pages with stats, friends with online presence, block / unblock.
4. **Public API** — `/api/public/*` with 6 endpoints (`GET /users`, `GET /users/:id`, `GET /posts`, `POST /posts`, `PUT /posts/:id`, `DELETE /posts/:id`). Authenticated by `X-API-Key` (keys prefixed `ap_` followed by a 32-char hex string), rate-limited per key (30 req/min). Plus `GET /api/public/` returning a self-describing endpoint listing. Interactive Swagger UI at `/api/docs/public`.
5. **ORM** — Prisma + `@prisma/adapter-pg` covers all 22 models with full type safety and migrations.
6. **Notification system** — Notifications are inserted on friend-request CRUD, post likes, comments, achievement unlocks, and game invites; pushed in real time over Socket.IO and persisted in the `Notification` table.
7. **File upload** — `multer` accepts images & documents under a MIME whitelist; 10 MB cap; hashed stored names; per-user listing; uploader-only delete; image preview; non-image files require auth to download.
8. **Standard user management** — Editable profile (username, email, bio, status, avatar). Default avatar served when none uploaded. Friends with real-time presence. Profile page shows level, XP progress, achievements, stats.
9. **Game statistics & match history** — `GET /api/game/stats`, `GET /api/game/history`, `GET /api/game/leaderboard?board=kills|obstacles|coins`, `GET /api/game/achievements`, `GET /api/game/challenges` — backed by `GameStat` (per game type) and `Game` (match records).
10. **LLM system interface** — `POST /api/helpdesk/chat` proxies user messages to Groq's LLM API. The backend keeps the API keys (rotating across multiple keys), injects a system prompt that explains AlpacaParty's features, applies a per-user rate limiter, and streams completions back to the floating `HelpDeskChat.vue` widget.
11. **Web-based game (Spit Royale)** — Real-time arena game over Socket.IO (`/minigames` namespace, dispatched by `MatchManager` to a `SpitRoyalMatch` instance per room). Free-for-all up to **10 players**; clear win condition (last alpaca standing). The server enforces a 500 ms spit cooldown, a 12 m maximum spit range, and a per-input movement-speed clamp — every `spit_hit` outside those windows is silently ignored.
12. **Add another game (Alpaca Road)** — Second distinct game over Socket.IO (`/minigames` namespace). `MatchManager` pairs players into lobbies up to **4 lanes** and instantiates an `AlpacaRoadMatch`, running its own tick loop. Stats are tracked under `gameType = "alpaca_road"` so leaderboards and history are independent of Spit Royale.
13. **Advanced 3D graphics** — Three.js scene graph with custom lighting, multiple cameras, alpaca model rigging + animation, and an interactive farm world with shop, customization, and editing.
14. **Game customization** — The farm world exposes alpaca colour customization, an in-world shop, and persistent per-user save data (`AlpacaFarm` JSONB). Match rooms expose customizable settings before the game starts.
15. **Gamification** — XP awarded for wins (with performance bonuses), losses, posts, and challenges. Auto level-up. 15 seeded achievements including `first_login`, `first_win`, `win_streak_5`, `sharpshooter` (10 Spit Royale wins), `road_warrior` (5 Alpaca Road stages), `social_butterfly`, `chatterbox`, `coin_hoarder`, `level_10`, `top_player`, etc. Daily challenges rotate and persist completions. Three leaderboards: kills (Spit Royale), obstacles (Alpaca Road), and coins. Notifications and progress bars provide visual feedback.

---

## Individual Contributions

### ValGSgit — Product Owner / Project Manager / Developer
- **Infrastructure**: Docker Compose (dev + prod), Makefile targets, `.env.example`, SSL cert generation script
- **Backend core**: Express server bootstrap, configuration system, middleware stack (helmet, cookie-parser, CORS, rate limiters, `authenticate`, `optionalAuth`, `requireApiKey`, error handler)
- **Auth**: JWT access + refresh in HTTP-only cookies, bcrypt hashing with constant-time compare
- **Database**: Prisma schema (22 models), migrations, seed data (including 15 achievements)
- **API surface**: All controllers (auth, users, friends, chat, posts, comments, game, notifications, uploads, public API, helpdesk)
- **Services**: Gamification engine, NotificationService, dataExportService (JSON / CSV / XML), uploadService, `socketService` for the `/` namespace, `MatchManager` on the `/minigames` namespace dispatching `SpitRoyalMatch` and `AlpacaRoadMatch`
- **AI**: Groq LLM proxy (`/helpdesk`) with key rotation and rate limiting; floating `HelpDeskChat.vue` widget
- **Frontend**: `Feed.vue`, `Profile.vue`, settings page, public-API-key management UI, notifications, `Help.vue`, `PrivacyPolicy.vue`, `TermsOfService.vue`, GDPR export + delete-request flows

### DavidPoetsch — Technical Lead / Developer
- **nginx**: Reverse-proxy config for dev + prod, HTTPS termination, WS upgrade for Socket.IO, security headers (HSTS, CSP, X-Frame-Options)
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

### Setup and Run

```bash
# 1. Clone
git clone https://github.com/ValGSgit/AlpacaParty.git
cd AlpacaParty

# 2. Build & start the whole stack (single command)
make
```

`make` does everything: on first run it generates `.env` from `.env.example`
with random secrets and your machine's IP/ports filled in, creates a
self-signed SSL cert, then builds the images and brings the stack up. When it
finishes it prints the app URLs (`make info`).

Then open the URL it prints — by default **https://localhost:8443** (accept the
self-signed cert warning). Optionally add your Groq keys (`GROQ_API_KEY1..3`)
to `.env` and `make re` to enable the AI help desk.

Other targets: `make down` · `make re` (rebuild+restart) · `make logs` ·
`make ps` · `make info` · `make clean` · `make fclean`.

### Ports

Every port is driven from `.env` — change one value and `make re`:

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTPS_PORT` | `8443` | External HTTPS entrypoint (the app URL) |
| `HTTP_PORT` | `8080` | External HTTP (redirects to HTTPS) |
| `API_PORT` | `3000` | Backend Express server (internal) |
| `FRONTEND_PORT` | `5173` | Frontend static server (internal) |
| `DB_PORT` | `5432` | PostgreSQL (internal) |

### Environment Variables

See [.env.example](.env.example) for the full list. Highlights:

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password (randomised by `make generate-secrets`) |
| `JWT_SECRET` | JWT signing secret |
| `VITE_API_URL` | Frontend API base path (default `/api`) |
| `GROQ_API_KEY1..3` | Up to 3 Groq keys for the AI help desk (round-robin) |
| `API_KEYS` | Default public-API keys for service-level callers |

Secrets and config are read straight from the project-root `.env` via Docker
Compose's `env_file` directive. `make generate-secrets` randomizes
`DB_PASSWORD`, every `JWT_*_SECRET`, and `API_KEYS` for you.

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
                  │    nginx    │ ← HTTPS, gzip, WS upgrade,
                  │             │   security headers
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
            ┌────┴─────┐
            ▼          ▼
       ┌────────┐  ┌─────────┐
       │Postgres│  │Groq API │
       │  :5432 │  │ (ext.)  │
       └────────┘  └─────────┘
```

### Production Services

| Service | Container | Purpose |
|---------|-----------|---------|
| `nginx` | `nginx_prod` | Reverse proxy, HTTPS |
| `backend` | `backend_prod` | Express + Socket.IO (`API_PORT`) |
| `frontend` | `frontend_prod` | nginx-served Vue 3 SPA build |
| `postgres` | `alpacaparty_db_prod` | PostgreSQL 16 |

---

[![OctoCounts](https://api.octocounts.com/badge/ValGSgit/AlpacaParty-ft_transcendence/branch/main)](https://octocounts.com/?q=https%3A%2F%2Fgithub.com%2FValGSgit%2FAlpacaParty-ft_transcendence%2Ftree%2Fbackend&ref=main)

---
## Resources

### Documentation & References
- [Vue 3](https://vuejs.org/guide/) · [Vue Router](https://router.vuejs.org/) · [Pinia](https://pinia.vuejs.org/)
- [Express.js](https://expressjs.com/) · [Socket.IO](https://socket.io/docs/)
- [Three.js](https://threejs.org/docs/)
- [Prisma](https://www.prisma.io/docs) · [PostgreSQL 16](https://www.postgresql.org/docs/16/)
- [nginx reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Groq API](https://console.groq.com/docs)

### AI Usage

AI tools (Claude, GitHub Copilot, ChatGPT) were used throughout the project. We treated them as a fast collaborator, not an author — every AI-assisted line was reviewed, tested, and adapted by the team. We can explain and defend any code in the project.

Specifically, AI assistance covered:

- **Frontend visual design & styling** — the look-and-feel of several pages, in particular the standalone `Help.vue` help center, `PrivacyPolicy.vue`, `TermsOfService.vue`, and parts of `NotFound.vue` / `AuthV3.vue` / `Feed.vue` were prototyped with AI (mock-ups, CSS hero treatments, scoped colour tokens, micro-animations). The structure and copy were then rewritten by the team so each page accurately describes what the project actually ships.
- **Boilerplate generation** — initial CRUD scaffolds and repetitive controller patterns
- **Configuration** — Docker Compose snippets, nginx templates
- **Debugging** — narrowing down Socket.IO disconnect issues, CORS edge cases, JWT refresh races
- **Documentation** — README structure, OpenAPI tags
- **The in-app help desk itself** — answers to user questions are generated by Groq's LLM API, never by code we wrote

---

## Known Limitations

- SSL uses a self-signed certificate in development — production must supply a CA-signed cert.
- Firefox / Safari / Edge: tested informally and broadly compatible, but Chrome is the primary supported browser per the subject's requirements.
- AlpacaParty matches are not matchmade — players manually join rooms via the in-game lobby. There is no ELO ranking; leaderboards rank by aggregate stats (kills, obstacles, coins).
- There is no group chat or chat-room feature — only 1-to-1 direct messages.
- There is no in-app moderation UI. Operator-level actions (e.g. banning a user) are performed directly against the database.

---

## License

See [LICENSE](LICENSE) for details.

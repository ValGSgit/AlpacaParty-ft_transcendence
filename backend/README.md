# AlpacaParty — Backend

> Express.js + Socket.IO server for the AlpacaParty project (42 Transcendence).
> Owners: **ValGSgit** · **DavidPoetsch**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (ESM, native `--watch` in dev) |
| Framework | Express.js 4 + `express-validator` |
| Database | PostgreSQL 16 via Prisma (`@prisma/adapter-pg`) |
| Real-time | Socket.IO (two namespaces: `/` for presence + DMs + posts + notifications, `/minigames` for match lobbies) |
| Auth | JWT (access + refresh, HTTP-only `jwt_token` / `refresh_token` cookies) · bcrypt password hashing |
| Security | `helmet` (CSP) · `cors` · `express-rate-limit` (per-user / per-IP) · `uploadSecurityCheck` middleware |
| HTTPS | Self-signed dev cert (Makefile target) + HTTPS server from `lib/httpsServer.js` |
| AI | Groq LLM API (round-robin key rotation) — server-side proxy in `helpdesk.js` |
| Docs | Swagger UI at `/api/docs/public` (public API) and `/api/docs/dev` (internal) |
| Testing | Vitest + Supertest (root: `backend/tests/`) |

---

## Folder Structure

```
backend/
├── src/
│   ├── index.js              # Entry — middleware, routes, HTTPS, Socket.IO attach
│   ├── config/
│   │   ├── index.js          # Centralised env-var config (JWT, DB, CORS, rate limits, Groq, uploads)
│   │   ├── helmet.js         # Helmet CSP — `default-src 'self'` + `wss:`
│   │   ├── prisma.js         # Prisma client singleton
│   │   └── validateConfig.js # Hard-throws on missing required env vars
│   ├── controllers/          # auth, users, friends, chat, posts, comments, game, notifications, uploads, public, helpdesk
│   ├── docs/                 # swagger.js + generated swagger-output-public-api.json
│   ├── lib/
│   │   ├── httpsServer.js    # HTTPS server factory
│   │   └── logger.js         # debug / info / warn / error (env-aware)
│   ├── middleware/
│   │   ├── auth.js           # authenticate() / optionalAuth() / requireApiKey()
│   │   ├── rateLimiters.js   # postWriteLimiter, chatSendLimiter, helpdeskLimiter, apiKeyRegenerateLimiter, …
│   │   ├── uploadSecurityCheck.js
│   │   └── errorHandler.js   # notFoundHandler + global error handler (JSON envelope)
│   ├── models/               # User, Game, Post, Comment, Friend, Message, Notification, File, GameStat, AlpacaFarm, Achievement, … (Prisma-backed DAL)
│   ├── routes/
│   │   ├── index.js          # Mounts everything under /api
│   │   ├── auth.js           # /api/auth/* (register, login, logout, refresh, me, validate)
│   │   ├── users.js          # /api/users/* (profile, password, export, delete, api-key, list, :id)
│   │   ├── friends.js        # /api/friends/* (list, requests, block)
│   │   ├── chat.js           # /api/chat/* (conversations, unread, dm history) — sending is via Socket.IO
│   │   ├── posts.js          # /api/posts/* + comments + likes
│   │   ├── game.js           # /api/game/* (stats, history, leaderboard, farm, achievements, challenges)
│   │   ├── notifications.js  # /api/notifications/*
│   │   ├── uploads.js        # /api/uploads/* (multer, MIME whitelist, hashed names)
│   │   ├── helpdesk.js       # /api/helpdesk/chat (Groq proxy)
│   │   └── public.js         # /api/public/* (X-API-Key, 30 req/min)
│   ├── services/
│   │   ├── authService.js          # hashPassword, comparePassword, JWT sign/verify
│   │   ├── socketService.js        # `/` namespace: presence, DMs, post broadcasts, notifications
│   │   ├── socketAuth.js           # Cookie-based JWT verification for both namespaces
│   │   ├── MatchManager.js         # `/minigames` namespace dispatcher
│   │   ├── BaseMatch.js            # Shared match lifecycle (lobby → playing → game_over)
│   │   ├── SpitRoyaleMatch.js      # Server-authoritative Spit Royale (up to 10 players)
│   │   ├── AlpacaRoadMatch.js      # Server-authoritative Alpaca Road (up to 4 lanes)
│   │   ├── GamificationService.js  # XP, levels, achievements, daily challenges
│   │   ├── notificationService.js  # create + push via socket
│   │   ├── dataExportService.js    # GDPR JSON / CSV / XML export
│   │   └── uploadService.js
│   ├── tools/                # seed + helper scripts
│   ├── utils/                # cryptoUtils, validators, small helpers
│   └── validators/           # express-validator chains per route
├── prisma/
│   └── schema.prisma         # 22 models — see ARCHITECTURE.md §4
└── tests/
    ├── setup.js
    ├── helpers/createApp.js  # Test app factory (no listen)
    ├── integration/          # auth, users, friends, posts, game, public, … routes
    └── unit/                 # config, middleware, services
```

---

## API Reference

### Base URL

```
Dev (Docker):  https://localhost:8443/api
Prod (Docker): https://<host>/api          (nginx reverse proxy in front)
Local (host):  http://localhost:3000/api   (no nginx)
```

### Cookies & headers

| Cookie / header | Purpose |
|---|---|
| `jwt_token` (HttpOnly, Secure) | Short-lived access token |
| `refresh_token` (HttpOnly, Secure) | Long-lived refresh token — used by `POST /auth/refresh` |
| `X-API-Key: ap_<32-char hex>` | Public API auth, generated from Profile → Settings |

### Endpoint map (full list in [ARCHITECTURE.md §3.3](../ARCHITECTURE.md#33-routes) and Swagger)

| Mount | Auth | Notes |
|---|---|---|
| `GET /api/health` | — | Docker healthcheck |
| `/api/auth/*` | mixed | register / login / logout / refresh / me / validate |
| `/api/users/*` | JWT | profile, password change, GDPR export & delete, public-API key CRUD, user listing |
| `/api/friends/*` | JWT | list, requests (send/accept/decline), block / unblock |
| `/api/chat/*` | JWT | conversations + DM history (sending is Socket.IO `dm:send`) |
| `/api/posts/*` | mixed | feed, create, like, comments — write actions rate-limited |
| `/api/game/*` | JWT | stats, history, leaderboard (incl. coins), farm save/load, achievements, challenges |
| `/api/notifications/*` | JWT | list, mark-read, delete |
| `/api/uploads/*` | JWT | multipart upload (1–10 files, ≤ 10 MB each, MIME whitelist) |
| `/api/helpdesk/chat` | JWT | Groq LLM proxy, per-user rate-limited |
| `/api/public/*` | API key | 6 RESTful endpoints, 30 req/min per key |

### Rate limits (see `middleware/rateLimiters.js`)

| Limiter | Window | Limit |
|---|---|---|
| `postWriteLimiter` | 60 s | 10 |
| `commentWriteLimiter` | 60 s | 30 |
| `likeLimiter` | 60 s | 120 |
| `uploadLimiter` | 60 s | 20 |
| `chatSendLimiter` | 10 s | 20 |
| `friendRequestLimiter` | 60 s | 20 |
| `helpdeskLimiter` | 60 s | 20 |
| `apiKeyRegenerateLimiter` | 1 h | 3 |
| Auth (`AUTH_RATE_LIMIT_MAX`) | 15 min | 50 (prod) / 1000 (dev) — overridable via env for E2E |
| Public API | 60 s | 30 per API key |

### Error envelope

```json
{ "error": { "message": "Human-readable description" } }
```

In development the `stack` field is also included.

---

## Real-time (Socket.IO)

Two namespaces share the HTTPS server.

### `/` (default — `services/socketService.js`)

JWT cookie validated by `socketAuth.js` on `connection`. Events:

- Inbound: `dm:send`, `dm:typing`, `dm:read`, `presence:ping`
- Outbound: `dm:new`, `dm:read_receipt`, `presence:update`, `notification:new`, `post:new`

Presence is reflected in `User.isOnline` / `User.lastSeen` via `User.setOnline()` / `setOffline()` (using `updateMany` so a deleted row never throws P2025).

### `/minigames` (`services/MatchManager.js`)

The same cookie auth, plus a `playerToMatch` map. `MatchManager` dispatches inbound events to the correct match instance (`SpitRoyaleMatch` or `AlpacaRoadMatch`):

- Inbound: `create_room`, `join_room`, `leave_room`, `ready_toggle`, `player_input`, `player_spit`, `spit_hit`, `player_jump`, `player_active`
- Outbound: `available_rooms`, `join_success`, `lobby_update`, `game_start`, `tick`, `game_over`

Each match runs its own ~33 ms tick loop (lazy-started on the first `addPlayer`). All gameplay is **server-authoritative** — Spit Royale enforces a 500 ms spit cooldown, 12 m range, and a per-player movement-speed clamp; clients that emit `spit_hit` outside those windows are silently ignored.

---

## Environment Variables

See `.env.example` at the project root. The most important ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTPS listen port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `JWT_SECRET` | — | **Required** — JWT signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | dev defaults | PostgreSQL connection |
| `CORS_ORIGINS` | `https://localhost:8443` | Comma-separated allowed origins |
| `GROQ_API_KEY1..3` | — | Up to 3 Groq keys for the help desk (round-robin) |
| `API_KEYS` | — | Default service-level public-API keys |
| `AUTH_RATE_LIMIT_MAX` | `50` | Auth-route limit — bumped by `make prod-e2e` for tests |
| `SSL_KEY_PATH` / `SSL_CERT_PATH` | dev paths | Used by `lib/httpsServer.js` |

Secrets are loaded straight from the project-root `.env` file in both dev and
prod via Docker Compose's `env_file` directive — no intermediate secret store.

---

## Running Locally

**With Docker (recommended)** — from the project root:

```bash
make build && make up
# https://localhost:8443        (frontend SPA, behind nginx)
# https://localhost:8443/api    (this backend, also behind nginx)
```

**Without Docker** (host Node 20):

```bash
make install         # installs backend + frontend deps
make dev             # backend on :3000, frontend on :5173
```

---

## Testing

```bash
# Unit + integration tests (in the backend container or on the host)
cd backend
npm test                   # vitest run
npm run test:watch         # watch mode
```

Integration tests spin up an in-process Express app via `tests/helpers/createApp.js` (no Docker needed). E2E tests (Playwright) live in `e2e/` at the repo root and run against the full prod stack — see `make prod-e2e`.

---

## Architecture — Request Lifecycle

```
Browser / Client
      │
      ▼
  nginx :8443  ──── HSTS / CSP / X-Frame-Options
      │  /api/*
      ▼
  index.js
      │
      ├─► helmet (CSP)
      ├─► cors (allowlist)
      ├─► HTTPS redirect, trust proxy
      ├─► express.json + cookieParser
      ├─► global rate limiter
      │
      ├─► /api/auth/*           → authController  → authService (bcrypt / JWT)
      │
      ├─► /api/users/*          → authenticate()  → userController  → Prisma
      │       └─► /me/api-key   → apiKeyRegenerateLimiter
      │       └─► /me/export    → dataExportService (JSON / CSV / XML)
      │
      ├─► /api/friends/*        → authenticate()  → friendsController
      ├─► /api/chat/*           → authenticate()  → chatController     (history; send via Socket.IO)
      ├─► /api/posts/*          → mixed auth      → postsController    (rate-limited writes)
      ├─► /api/game/*           → authenticate()  → gameController
      ├─► /api/notifications/*  → authenticate()  → notificationsController
      ├─► /api/uploads/*        → authenticate()  → uploadsController  (multer + MIME whitelist)
      ├─► /api/helpdesk/chat    → authenticate()  → Groq LLM proxy     (helpdeskLimiter)
      ├─► /api/public/*         → requireApiKey() → public-api routes  (30 req/min per key)
      ├─► /api/admin/*          → requireAdmin()  → adminController    (separate JWT cookie)
      │
      └─► errorHandler          → JSON envelope, stack only in dev
```

For full route tables, Socket.IO event maps, the Prisma schema diagram, and security model, see the canonical reference at the repository root: [`ARCHITECTURE.md`](../ARCHITECTURE.md).

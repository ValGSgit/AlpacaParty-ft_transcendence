# AlpacaParty — Architecture & Module Reference

> Full-stack social gaming platform. Users raise alpacas in a 3-D farm, compete in multiplayer mini-games (SpitRoyale, AlpacaRoad), build a social graph, share posts, and earn achievements — all served over HTTPS with real-time WebSocket communication.

*Last updated: 2026-05-28. Reflects all changes through the latest pass: 2FA removal, sanitizer consolidation, feed pagination fix, room-ID hardening, logger adoption, seed-password vault migration, CSS reorganization into `frontend/src/styles/`, and the Help/Privacy/Terms rewrite for accurate, project-specific content.*

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Infrastructure](#2-infrastructure)
3. [Backend](#3-backend)
   - [Startup Sequence](#31-startup-sequence)
   - [Config & Secrets](#32-config--secrets)
   - [Routes](#33-routes)
   - [Controllers](#34-controllers)
   - [Services](#35-services)
   - [Game Engine (Server)](#36-game-engine-server)
   - [Middleware](#37-middleware)
   - [Models (DAL)](#38-models-dal)
   - [Validators](#39-validators)
   - [Utilities & Libraries](#310-utilities--libraries)
4. [Database Schema](#4-database-schema)
5. [Frontend](#5-frontend)
   - [Entry & Router](#51-entry--router)
   - [State Management (Pinia)](#52-state-management-pinia)
   - [Services](#53-services)
   - [Views](#54-views)
   - [Game Engine (Client)](#55-game-engine-client)
6. [Key Data Flows](#6-key-data-flows)
   - [Authentication Flow](#61-authentication-flow)
   - [Real-Time (Socket.io)](#62-real-time-socketio)
   - [Multiplayer Game Flow](#63-multiplayer-game-flow)
   - [File Upload Flow](#64-file-upload-flow)
7. [Security Model](#7-security-model)
8. [Known Issues & Improvement Areas](#8-known-issues--improvement-areas)

---

## 1. System Overview

```
Browser
  │  HTTPS :8443
  ▼
Nginx (reverse proxy)
  │
  ├── /api/*        → Backend (Express + HTTPS :3000)
  ├── /socket.io/*  → Backend (Socket.io, same port)
  ├── /uploads/*    → Backend (static files, auth-gated)
  └── /*            → Frontend (Vite :5173 dev / built SPA prod)

Backend ──── PostgreSQL (Prisma ORM)
         ├── HashiCorp Vault  (secrets at rest)
         └── Groq AI API      (helpdesk SSE stream)
```

| Layer | Technology |
|---|---|
| Reverse proxy | Nginx |
| Backend | Node.js, Express.js, Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Secrets | HashiCorp Vault (KV v2) |
| Frontend | Vue 3 (Composition API), Pinia, Three.js |
| Realtime | Socket.io (bidirectional, cookie-authenticated) |
| Auth | JWT httpOnly cookies (email/password registration) |
| File storage | Disk (Docker volume, UUID-prefixed filenames) |
| AI | Groq LLM (SSE streaming, round-robin key rotation) |
| Containers | Docker Compose (dev + prod variants) |

---

## 2. Infrastructure

### Nginx (`nginx/conf/nginx.conf` / `nginx.prod.conf`)

Single HTTPS server block, port 443 (host-mapped to 8443). HTTP redirects to HTTPS.

| Location | Destination | Notes |
|---|---|---|
| `/api/` | `https://backend` | Upgrade headers pass-through for SSE; 24 h read timeout |
| `/socket.io/` | `https://backend` | WebSocket upgrade, 24 h timeout |
| `/uploads/` | `https://backend` | Proxied to backend static serving |
| `/ws` | `http://frontend` | Vite HMR (dev only) |
| `/` | `http://frontend` | SPA catch-all |

Security headers set exclusively at Nginx level; matching Helmet headers are stripped via `proxy_hide_header` to prevent duplicates: HSTS (1 yr), X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Permissions-Policy.

### Docker Compose

**Dev** (`compose.yaml`) — includes backend, frontend, postgres, nginx, vault, e2e (optional).  
**Prod** (`compose.prod.yaml`) — same services with production Dockerfiles and vault-init automation.

Shared network: `alpacaparty_net`. Named volumes: `pg_data`, `ssl`, `backend_data`, `frontend_data`.

Secrets are injected by mounting a tmpfs `/run/secrets` in the backend container; `VAULT_TOKEN` is passed via compose env.

### HashiCorp Vault

Vault runs in dev mode (auto-unsealed, KV v2 pre-mounted at `secret/`, fixed root token from `VAULT_TOKEN`). The `vault/init/seed.sh` script runs once via the `vault-init` container to write all secrets (DB password, JWT secrets, Groq API keys) into `secret/alpacaparty`. The backend reads them at startup via `backend/src/tools/fetchSecrets.js` + `backend/src/lib/vault.js`.

### Docker Entrypoints

**Dev** (`docker-entrypoint.sh`):
1. Load secrets from Vault (`load-secrets.sh`)
2. `prisma migrate dev` (creates/applies migrations interactively)
3. `prisma generate`
4. `npm run seed` (achievements + demo user + admin)
5. Start app

**Prod** (`docker-entrypoint-prod.sh`):
1. Load secrets
2. If migration directories exist → `prisma migrate deploy`
3. If no migration directories exist → `prisma db push --accept-data-loss` (initial deploy; safe because DB is empty)
4. `prisma generate`
5. `npm run seed`
6. Start app

> **Workflow**: Create migrations locally with `prisma migrate dev --name <name>`, commit them, then `make prod-up` uses `migrate deploy`. The `db push` fallback only runs on a brand-new empty database.

---

## 3. Backend

### 3.1 Startup Sequence

`backend/src/index.js` — executed after entrypoint:

1. Load + validate config (`validateConfig.js` — hard-throws on missing required vars)
2. Build Express app
3. Apply middleware stack: CORS → Helmet (CSP) → trust-proxy → HTTPS-redirect → body parsers → global rate limiter
4. Serve `/uploads` static with `uploadSecurityCheck` middleware
5. Mount all routes at `/api`
6. Register `errorHandler` + `notFoundHandler`
7. Create HTTPS server (`lib/httpsServer.js`)
8. Attach Socket.io (`socketService.init(server)`)
9. Listen; register SIGTERM/SIGINT graceful shutdown

### 3.2 Config & Secrets

| File | Purpose |
|---|---|
| `config/index.js` | Single source for all env vars: port, JWT secrets/expiry/cookies, DB URL, CORS origins, rate limit settings, password policy, SSL paths, Groq key array, upload limits |
| `config/helmet.js` | Helmet CSP: `default-src 'self'`; image sources include picsum, pexels; WebSocket `wss:`; no eval; frames/objects/embeds blocked |
| `config/prisma.js` | Prisma Client singleton (`@prisma/adapter-pg`) |
| `config/validateConfig.js` | Startup guard — throws on missing required vars |

### 3.3 Routes

All mounted at `/api` by `routes/index.js`.

#### `GET /api/health`
Docker healthcheck target. Returns `{ status: "ok" }`.

#### `/api/auth` (`routes/auth.js`)

Rate limited by `authLimiter` (50 req/15 min prod, 1 000 dev).

| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account (username, email, password) |
| POST | `/login` | Login with username **or** email + password |
| POST | `/logout` | Clear JWT cookies, mark user offline |
| POST | `/refresh` | Exchange refresh cookie → new access token |
| GET | `/me` | Return authenticated user object |

#### `/api/users` (`routes/users.js`) — all routes require `authenticate`

| Method | Path | Description |
|---|---|---|
| GET | `/me` | Current user profile |
| PUT | `/me` | Update profile (username, email, bio, status, avatar, isPublic) |
| DELETE | `/me` | Delete own account |
| PUT | `/me/password` | Change password |
| GET | `/me/export` | GDPR data export (`?format=json\|csv\|xml`) |
| POST | `/me/delete-request` | Request GDPR deletion |
| GET | `/me/data-requests` | List deletion requests |
| GET | `/me/api-key` | Get current public API key |
| POST | `/me/api-key` | Generate new API key (rate-limited) |
| DELETE | `/me/api-key` | Revoke API key |
| GET | `/` | List public users (pagination + search) |
| GET | `/:id` | View another user's profile; response includes `friend_status` field |

> `GET /users/:id` response shape:
> ```json
> {
>   "user": { ... },
>   "friend_status": {
>     "status": "none | pending_sent | pending_received | friends",
>     "requestId": 42
>   }
> }
> ```
> On 403 (private profile), the same `friend_status` is included so the locked-card can still render the correct friend button.

#### `/api/friends` (`routes/friends.js`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Friend list (paginated) |
| GET | `/online` | Online friends |
| GET | `/blocked` | Blocked users |
| GET | `/requests` | Incoming + outgoing requests |
| POST | `/requests` | Send request (auto-accepts if mutual) |
| PUT | `/requests/:id/accept` | Accept request |
| PUT | `/requests/:id/decline` | Decline request |
| DELETE | `/:id` | Remove friend |
| POST | `/block` | Block user |
| DELETE | `/block/:id` | Unblock user |

#### `/api/chat` (`routes/chat.js`)

REST is for history only; sending messages is done over Socket.io (`dm:send`).

| Method | Path | Description |
|---|---|---|
| GET | `/conversations` | All DM conversations (newest first, with last message + unread count) |
| GET | `/unread` | Total unread DM count |
| GET | `/dm/:userId` | DM history with user; marks messages as read |

#### `/api/game` (`routes/game.js`) — all routes require `authenticate`

| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Game stats (`?gameType=spit_royale`) |
| GET | `/history` | Match history (paginated) |
| GET | `/leaderboard` | ELO leaderboard (`?gameType=`) |
| GET | `/leaderboard/coins` | Coins leaderboard |
| POST | `/result` | Record offline/AI game result |
| GET | `/farm` | Alpaca farm JSON (`?userId=X` to view another user's farm) |
| PUT | `/farm` | Save farm JSON — accepts `{ farmData }`, `{ farm }`, or flat `{ items, alpacas, coins, upgrades, herdsize }` |
| GET | `/achievements` | All achievements with unlock status |
| GET | `/challenges` | Active daily/weekly challenges + progress |

#### `/api/posts` (`routes/posts.js`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | required | Social feed (public + friends' posts) |
| POST | `/` | required | Create post (optional image URL) |
| GET | `/user/:userId` | optional | Posts by a specific user |
| GET | `/:id` | optional | Single post |
| PUT | `/:id` | required | Update own post |
| DELETE | `/:id` | required | Delete own post |
| POST | `/:id/like` | required | Like post |
| DELETE | `/:id/like` | required | Unlike post |
| GET | `/:id/comments` | optional | Post comments |
| POST | `/:id/comments` | required | Add comment |
| DELETE | `/:id/comments/:commentId` | required | Delete comment (owner / post-owner) |

Rate limited per action type (`postWriteLimiter`, `commentWriteLimiter`, `likeLimiter`).

#### `/api/notifications` (`routes/notifications.js`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Notifications (`?unreadOnly=false&limit=30&offset=0`) |
| PUT | `/read-all` | Mark all as read |
| PUT | `/:id/read` | Mark one as read |
| DELETE | `/:id` | Delete notification |

#### `/api/uploads` (`routes/uploads.js`)

| Method | Path | Description |
|---|---|---|
| POST | `/` | Upload 1–10 files (multipart/form-data, max 10 MB each) |
| GET | `/` | List my uploaded files |
| DELETE | `/:id` | Delete file (record + disk) |

#### `/api/public` (`routes/public.js`)

Requires `X-API-Key` header. Rate limited 30 req/min per user.

| Method | Path | Description |
|---|---|---|
| GET | `/` | API docs (no auth) |
| GET | `/users` | Public users (`?search=&limit=100&anonymized=true`) |
| GET | `/users/:id` | Public user profile |
| GET | `/posts` | Public feed |
| POST | `/posts` | Create post via API key |
| PUT | `/posts/:id` | Update post via API key |
| DELETE | `/posts/:id` | Delete post via API key |

#### `/api/helpdesk` (`routes/helpdesk.js`)

| Method | Path | Description |
|---|---|---|
| POST | `/chat` | Send message array, receive SSE-streamed Groq response |

Validates 1–20 messages, max 2 000 chars each. Groq API keys rotated round-robin. AbortController handles client disconnects. `helpdeskLimiter` applies.

---

### 3.4 Controllers

| Controller | Key Responsibilities |
|---|---|
| `authController` | Register, login, logout, token refresh, `me`, validate |
| `userController` | Profile CRUD, password change, GDPR export/deletion, API key management, `friend_status` in `getUser` |
| `friendController` | Friend list, requests, block/unblock |
| `chatController` | Conversation list, DM history, unread count |
| `gameController` | Stats, history, leaderboard, offline results, farm CRUD (single canonical endpoint), achievements, challenges |
| `postController` | Feed, post CRUD, like/unlike; HTML stripped via `stripDangerousHtml` |
| `commentController` | Comment CRUD (imported by `routes/posts.js`) |
| `notificationController` | List, mark read, delete |
| `uploadController` | Upload (multer → magic-byte validation → DB record), list, delete |
| `publicApiController` | Public API equivalents of user/post endpoints with optional anonymization |

### 3.5 Services

#### `authService.js`
- `hashPassword` / `comparePassword` — bcrypt 12 rounds
- `generateAccessToken` / `generateRefreshToken` / `generatePublicApiToken` — JWT signing
- `verifyToken` / `verifyRefreshToken` / `verifyPublicApiToken` — JWT verification
- `validatePassword` — policy: ≥8 chars, uppercase, lowercase, number

#### `socketService.js`

Two Socket.io namespaces on the same HTTPS server:

**Default `/` namespace** — social layer:

| Event (client → server) | Description |
|---|---|
| `dm:send` | Send DM: checks friendship + block, persists to `Message`, emits `dm:receive` |
| `dm:read` | Mark messages from a sender as read |
| `farm:save` | Persist farm state to DB |
| `farm:load` | Load farm state from DB |

| Event (server → client) | Description |
|---|---|
| `dm:receive` | New DM (broadcast to DM room `dm:{minId}-{maxId}`) |
| `presence` | User online/offline status change (broadcast to all) |
| `notification` | Real-time notification push (to `user:{id}` room) |

Auth: `socketAuthMiddleware` validates JWT from cookie; attaches `socket.user`. On connect: marks online, broadcasts presence. On disconnect: marks offline after 30 s reconnection window.

> **Note**: Group chat socket events (`room:join`, `room:send`) have been removed — `ChatRoom` model is not implemented.

**`/minigames` namespace** — game layer, managed by `MatchManager`.

#### `notificationService.js`
- `setIo(io)` — injects Socket.io instance
- Convenience methods: `friendRequest`, `friendAccepted`, `postLiked`, `postCommented`, `achievementUnlocked`, `gameInvite`
- Each: creates `Notification` DB record + emits to `user:{userId}` room

#### `uploadService.js`
- Multer disk-storage (UUID-prefixed filenames, configured upload dir)
- `validateFileMagicBytes(file)` — first-bytes check against known image signatures (JPEG, PNG, GIF, WebP)
- `saveFileRecord(userId, file)` — persist metadata to `File` table
- `deleteFileFromDisk(storedName)` — remove from disk

#### `dataExportService.js`
- `exportUserData(userId, format)` — collects full user data, serializes to JSON / CSV / XML for GDPR compliance

---

### 3.6 Game Engine (Server)

Lives in `backend/src/services/`. Runs entirely in the `/minigames` Socket.io namespace.

#### `MatchManager.js`

| Event | Action |
|---|---|
| `create_room` | Instantiate match (SpitRoyalMatch or AlpacaRoadMatch) |
| `join_room` | Add player if room not full |
| `leave_room` | Remove player; destroy match if empty |
| `ready_toggle` | Toggle player ready; auto-start when all ready |

Game type registry: `2` → SpitRoyalMatch, `4` → AlpacaRoadMatch.  
Broadcasts `available_rooms` to all clients on any state change.

#### `BaseMatch.js`

| Responsibility | Details |
|---|---|
| Player map | `Map<socketId, playerData>` |
| Status | `LOBBY → PLAYING → FINISHED` |
| `addPlayer` / `removePlayer` | Maintain player list, sync lobby |
| `toggleReady` / `checkStart` | Auto-start when all ready |
| `syncLobby` | Broadcast player list to room |
| `broadcast(event, data)` | Emit to match room |
| Heartbeat | Server-side `update()` loop at configured tick rate |

#### `AlpacaRoadMatch.js`

Top-down obstacle-avoidance racing. 4 lanes, obstacles spawn on a timer (1–3 s, adjustable). Difficulty scales with points (speed 30→100, timer multiplier 1.0→0.5). ELO updated (K=24) on match end. Win by highest score when only one remains.

#### `SpitRoyaleMatch.js`

Arena battle royale. Players spawn in a circle (radius 25). HP=3; eliminated at 0. Win: last alpaca standing (requires ≥2 players). Status correctly transitions `LOBBY → PLAYING → GAME_OVER` on match end.

---

### 3.7 Middleware

| File | Exports | Purpose |
|---|---|---|
| `middleware/auth.js` | `authenticate`, `optionalAuth` | Verify JWT from `jwt_token` cookie; reject banned users; attach `req.user` |
| `middleware/apiKey.js` | `requireApiKey` | Validate `X-API-Key` header; attach `req.userId` |
| `middleware/rateLimiters.js` | Multiple limiters | Per-route limiters (friend requests, chat, posts, comments, likes, uploads, helpdesk, API key regen) keyed by `u:{userId}` or `ip:{IP}` |
| `middleware/errorHandler.js` | `errorHandler`, `notFoundHandler` | Global error → `{ error: { message, fields? } }`; 404 fallback |

---

### 3.8 Models (DAL)

| Model | Key Methods |
|---|---|
| `User` | `create`, `findById/ByUsername/ByEmail`, `update`, `updatePassword`, `search`, `findAll`, `setOnline/setOffline`, `shapeUserForClient`, `getApiKey/setApiKey/revokeApiKey`, `deleteById` |
| `Game` | `create`, `joinGame`, `finishGame`, `cancelGame`, `getStats`, `getMatchHistory`, `getLeaderboard`, `getCoinsLeaderboard`, `updateStats`, `updateElo`, `getFarm`, `updateFarm` |
| `Friend` | `sendRequest`, `acceptRequest`, `declineRequest`, `getFriends`, `getOnlineFriends`, `areFriends`, `getFriendStatus`, `removeFriend`, `blockUser`, `unblockUser`, `isBlockedBetween` |
| `Message` | `create`, `getConversation`, `getConversationsList`, `countUnread`, `markAsRead` |
| `Post` | `create`, `update`, `delete`, `getFeed`, `getByUser`, `likePost`, `unlikePost`, `getComments`, `shapePost` |
| `Comment` | `create`, `delete`, `getByPost` — transactional (updates post count atomically) |
| `Notification` | `create`, `getForUser`, `markRead`, `markAllRead`, `countUnread`, `delete`, `shapeNotification` |
| `Achievement` | `getAll`, `getUserAchievements`, `unlock` (idempotent), `getUserChallengeProgress` |
| `File` | `getByUploader`, `delete` |
| `DataRequest` | `create`, `getByUser`, `approve` |

`Friend.getFriendStatus(viewerId, targetId)` returns `{ status: 'none' | 'pending_sent' | 'pending_received' | 'friends', requestId? }` via a single 3-query parallel lookup.

---

### 3.9 Validators

All use `express-validator`. `validatorUtils.checkValidation` converts errors into `CustomError(400)`.

| File | Validates |
|---|---|
| `authValidator.js` | Register (username 3–32, email format, password policy), login |
| `userValidator.js` | Profile update, password change |
| `contentValidator.js` | Post (1–5 000 chars), comment (1–1 000), image URL (≤2 048), ID params |
| `limitValidator.js` | Pagination limit/offset |
| `publicApiValidator.js` | Public API query params |

### 3.10 Utilities & Libraries

| File | Purpose |
|---|---|
| `utils/CustomError.js` | `extends Error` — carries `.status` (HTTP code); caught by `errorHandler` |
| `utils/pagination.js` | Normalizes `limit` / `offset` from query strings |
| `utils/uploadSecurity.js` | Middleware on `/uploads` static route: images → inline; non-images → attachment + ownership check; path-traversal guard |
| `lib/vault.js` | HTTPS Vault KV v2 client (read, write, list) |
| `lib/logger.js` | `debug()` wrapper |
| `lib/httpsServer.js` | Creates `https.Server` from configured TLS certs |
| `tools/fetchSecrets.js` | Reads secrets from Vault → writes to `/run/secrets/.env` |

---

## 4. Database Schema

```
User ──────── UserAuth         (1:1) password hash
         ├─── UserStats        (1:1) XP, level
         ├─── UserSettings     (1:1) isPublic
         ├─── PublicApi        (1:1) API key
         ├─── AlpacaFarm       (1:1) items[], alpacas[], coins, upgrades, herdsize (JSON fields)
         ├─── FriendRequest    (1:N sender, 1:N receiver) — status: pending|accepted|declined
         ├─── Friend           (1:N) — two rows per friendship (bidirectional pairs)
         ├─── BlockedUser      (1:N) — unidirectional; checked both ways in queries
         ├─── Message          (1:N sender, 1:N receiver) — isRead, compound index on (senderId, receiverId)
         ├─── Game             (1:N player1, player2, winner) — status, gameType, scores
         ├─── GameStat         (1:N) — unique(userId, gameType); elo starts 1000
         ├─── Post             (1:N) — content, imageUrl, isPublic, denormalized counts
         │      ├── PostLike   (M:N with User) @@unique([postId, userId])
         │      └── Comment    (1:N → User) — transactional count sync
         │
         ├─── Notification     (1:N) — type, title, message, referenceType/Id, isRead
         ├─── UserAchievement  (M:N with Achievement) — unlockedAt
         ├─── UserDailyChallenge (M:N with DailyChallenge) — completed, completedAt
         ├─── File             (1:N) — originalName, storedName (UUID-prefix), mimeType, sizeBytes, url
         ├─── DataRequest      (1:N) — GDPR deletion requests, status, completedAt
         └─── PasswordResetToken (1:N) — token, expiresAt (schema exists; routes not yet implemented)
```

**Design decisions:**
- `Friend` uses two unidirectional rows per pair; all friend queries only need to scan one direction.
- `AlpacaFarm.items` and `.alpacas` are `Json` — entire farm state is one blob per user.
- `GameStat` unique on `(userId, gameType)` — stats are per-game-type, not aggregated.
- Cascade deletes on almost everything from `User` — hard-deleting a user is a full cleanup.
- `PasswordResetToken` exists in schema but forgot-password / reset-password routes are not yet implemented.

---

## 5. Frontend

### 5.1 Entry & Router

**`main.js`**: create Vue app → register Pinia → `authStore.fetchUser()` (restore session) → register router → mount.

**`router/index.js`** — `beforeEach` guard enforces `meta.requiresAuth` and `meta.guestOnly`:

| Route | Component | Auth |
|---|---|---|
| `/` | `Game.vue` | No |
| `/login`, `/register` | `AuthV3.vue` | Guest only |
| `/profile` | `Profile.vue` | Yes |
| `/friends` | `Friends.vue` | Yes |
| `/feed` | `Feed.vue` | Yes |
| `/user/:id` | `UserProfile.vue` | Yes |
| `/messages` | `Messages.vue` | Yes |
| `/docs` | `ApiDocs.vue` | No |
| `/help` | `Help.vue` | No |
| `/privacy` | `PrivacyPolicy.vue` | No |
| `/terms` | `TermsOfService.vue` | No |
| `*` | `NotFound.vue` | No |

### 5.2 State Management (Pinia)

#### `stores/auth.js`
State: `user`, `loading`, `error`. Getters: `isAuthenticated`, `username`.

| Action | HTTP Call |
|---|---|
| `register` | `POST /auth/register` |
| `login` | `POST /auth/login` |
| `logout` | `POST /auth/logout` |
| `fetchUser` | `GET /auth/me` |
| `updateProfile` | `PUT /users/me` |
| `changePassword` | `PUT /users/me/password` |
| `deleteAccount` | `DELETE /users/me` |
| `getPublicProfile` | `GET /users/:id` |

### 5.3 Services

#### `services/api.js`
Fetch wrapper. `credentials: 'include'` on all requests. On 401: attempts `POST /auth/refresh`, retries once. Throws `HttpError` with `.response` (Response object) and `.data` (parsed body) on non-2xx.

#### `services/socket.js`
Socket.io client for the default `/` namespace. `connectSocket()` / `disconnectSocket()` / `getSocket()`. Derives URL from `VITE_API_URL`.

#### `services/logger.js`
`debug()` and `devError()` — no-ops in production builds.

### 5.4 Views

| View | Key Features |
|---|---|
| `AuthV3.vue` | Unified login/register with tab switching |
| `UserProfile.vue` | Read-only public profile; friend button with four states (none / pending\_sent / pending\_received / friends); Accept, Decline, Unfriend actions |
| `Profile.vue` | Editable profile form; settings tabs (account, privacy, password, data, danger zone); achievements grid |
| `Feed.vue` | Create post (with image upload), infinite-scroll feed, like/comment per post |
| `Friends.vue` | Friend list, requests, blocked users; search + sort |
| `Messages.vue` | Conversation list + DM chat panel; sends via `socket.emit('dm:send')` |
| `ApiDocs.vue` | Embedded Swagger UI + custom endpoint reference |
| `Help.vue` | Project help center: searchable TOC, sections covering getting started, the two games (Spit Royale / Alpaca Road), GDPR / account settings, the Public API, and contact. Dispatches `open-paca` to surface `HelpDeskChat.vue` for the AI assistant |
| `HelpDeskChat.vue` | Floating "Paca" AI widget — streams SSE from `/helpdesk/chat` (Groq-backed) |
| `PrivacyPolicy.vue` | GDPR-aligned privacy notice — describes the data actually collected (account, gameplay, social, operational), the Groq subprocessor for help-desk replies, and self-service rights (export, deletion) via Profile → Settings |
| `TermsOfService.vue` | Non-commercial student-project ToS — acceptance, accounts, conduct & anti-cheat, user content + IP (cross-links to Privacy), Public API rules, termination, liability ("as is", capped at zero), governed by French law |
| `App.vue` | Navbar (auth-aware), router outlet, socket lifecycle, notification toasts, DM bubble |

### 5.5 Game Engine (Client)

#### `Game.vue`
Main container. Switches between 3-D farm view and mini-game lobby. Connects `GameClient` to `/minigames`.

#### `core/useGameEngine.js`
Vue composable. Initializes Three.js: scene, perspective camera, WebGL renderer, ambient + directional lighting, fog, shadows, `EffectComposer` (Bokeh depth-of-field), OrbitControls. Returns scene globals (`gScene`, `gCamera`, `gPlayer`, etc.) shared across modules.

Other core composables: `useAnimation`, `useCamera`, `useCollider`, `useInput`, `usePhysics`, `usePlayerControls`, `useSpatialBridge`, `useUIManager`, `saveLoadGame` (calls `PUT /game/farm`), `modelCache` (GLTF cache).

#### `mini_games/GameClient.js`
Socket.io client for `/minigames`. Emits: `create_room`, `join_room`, `leave_room`, `ready_toggle`, `player_input`, `player_spit`, `spit_hit`, `player_jump`, `player_active`. Listens: `available_rooms`, `join_success`, `lobby_update`, `game_start`, `tick`, `game_over`.

#### `mini_games/alpacaRoad.js` / `spitRoyal.js`
Client-side rendering and input handling per game type. Receive authoritative state from server via tick events; render via Three.js.

#### `mini_games/init.js`
Bootstrap: connects `GameClient`, renders `MultiplayerLobby.vue`, transitions to game scene on `game_start`.

#### `components/MultiplayerLobby.vue`
Lists available rooms filtered by game type, create/join controls, ready toggle, player list.

---

## 6. Key Data Flows

### 6.1 Authentication Flow

```
Browser          Frontend              Backend
  │                  │                    │
  │─ POST /login ───►│─ api.post() ──────►│ comparePassword()
  │                  │                    │ generateAccessToken()
  │                  │                    │ generateRefreshToken()
  │                  │◄─ Set-Cookie ──────│  jwt_token (httpOnly, Secure, SameSite=Strict)
  │                  │   (two cookies)    │  jwt_refresh_token
  │◄─ navigate ──────│                    │
  │                  │                    │
  │ [token expires]  │                    │
  │                  │─ any request ─────►│ 401
  │                  │─ POST /refresh ───►│ verifyRefreshToken() → new jwt_token
  │                  │─ retry request ───►│ 200
```

### 6.2 Real-Time (Socket.io)

```
Client                   Backend (socket)           DB
  │─ connect (cookie) ──►│ socketAuthMiddleware      │
  │                      │ setOnline(userId) ────────►│
  │                      │─ presence broadcast ──────►│ (to all)
  │                      │                            │
  │─ dm:send ───────────►│ areFriends check           │
  │                      │ isBlockedBetween check     │
  │                      │ Message.create() ──────────►│
  │                      │─ dm:receive ──────────────►│ (to dm room)
  │◄─ ack(null) ─────────│                            │
  │                      │─ notification:event ──────►│ (to user:{id} room)
```

### 6.3 Multiplayer Game Flow

```
Player A           /minigames ns         Player B
  │─ create_room ──►│ new SpitRoyalMatch  │
  │◄─ available_rooms ──────────────────►│
  │                 │◄─ join_room ────────│
  │◄─ lobby_update ─────────────────────►│
  │─ ready_toggle ──►│◄─ ready_toggle ───│
  │                 │ checkStart() → start()
  │◄─ game_start ───────────────────────►│
  │─ player_input ──►│◄─ player_input ───│
  │                 │─ tick ────────────►│ (game_state broadcast)
  │                 │ checkWinCondition()│
  │◄─ game_over ────────────────────────►│
  │                 │ Game.updateElo()   │
```

### 6.4 File Upload Flow

```
Browser          Nginx           Backend
  │─ POST /uploads ►│─ proxy ───►│ uploadLimiter
  │  (multipart)    │            │ multer → disk (UUID filename)
  │                 │            │ validateFileMagicBytes()
  │                 │            │ File.create() → DB record
  │◄─ { id, url } ──────────────│
  │                 │            │
  │─ GET /uploads/x.jpg ────────►│ uploadSecurityCheck middleware
  │                 │            │ is image? → inline  (no auth needed)
  │                 │            │ is non-image? → check ownership → attachment
  │◄─ file bytes ───────────────│
```

---

## 7. Security Model

| Layer | Mechanism |
|---|---|
| Transport | TLS 1.2/1.3, HSTS 1 year |
| Headers | Helmet CSP (no eval, no frames) + Nginx (X-Frame-Options, X-Content-Type-Options, Permissions-Policy) |
| Auth | httpOnly + Secure + SameSite=Strict JWT cookies; refresh token rotation |
| Passwords | bcrypt 12 rounds; policy enforced server-side |
| Public API | Per-user API keys; `X-API-Key` header; 30 req/min rate limit |
| Rate limiting | Per-route Express limiters; stricter in production |
| Input validation | `express-validator` on all mutation endpoints |
| XSS | Post content sanitized (strips script/iframe/object/embed/event-handler attributes) |
| File uploads | Magic-byte validation; SVG served as attachment; non-image ownership check |
| SQL injection | Prisma parameterized queries throughout |
| CORS | Explicit origin allowlist |
| Secrets | Vault-managed; never in source control |
| GDPR | Data export (JSON/CSV/XML) + deletion requests; cascading deletes on user removal |

---

## 8. Known Issues & Improvement Areas

### Resolved

| File | Bug / Issue | Fix applied |
|---|---|---|
| `SpitRoyaleMatch.js:113` | `===` instead of `=` — `status` never set to `GAME_OVER` | Changed to `=` |
| `socketService.js` | `room:join` / `room:send` referenced `ChatRoom` — `ReferenceError` at runtime | Handlers removed |
| `docker-entrypoint-prod.sh` | `prisma migrate dev` blocked by `NODE_ENV=production` on first deploy | Changed fallback to `prisma db push` |
| `UserProfile.vue` | Friend button always showed "Add Friend" regardless of actual friendship state | `friend_status` added to `GET /users/:id`; button reflects all four states |
| `users.js` / `alpacaFarmController.js` | Duplicate farm endpoints at `/users/me/farmdata` and `/game/farm` | Removed `/me/farmdata`; `/game/farm` is canonical |
| `schema.prisma` | Dead `twoFactorEnabled` / `twoFactorSecret` columns with no corresponding routes | Dropped from schema; migration `20260514200000_remove_2fa_fields` applied |
| `postController.js` / `commentController.js` | `stripDangerousHtml` duplicated in both files; missing `<form>` and `<style>` tags | Extracted to `utils/htmlSanitizer.js`; gaps patched |
| `MatchManager.js` | Room IDs generated with `Math.random()` — weak, collision-prone | Replaced with `crypto.randomUUID()` |
| `SpitRoyaleMatch.js` / `MatchManager.js` | `console.log` in hot paths; no logger import | Replaced with `debug()` from `#lib/logger.js` |
| `AlpacaRoadMatch.js` | `console.error` instead of logger | Replaced with `error()` from `#lib/logger.js` |
| `GameClient.js` | `console.log` / `console.error` bypassed the frontend logger service | Replaced with `debug` / `devError` |
| `postController.js` / `commentController.js` / `socketService.js` | Notification failures swallowed silently with `.catch(() => {})` | `.catch` now logs via `debug()` |
| `seed.js` | Admin + demo passwords hardcoded in source; admin password printed to stdout | Passwords read from `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` env vars (Vault-backed); stdout print removed |
| `alpacaFarmController.test.js` | Orphaned test file with no corresponding controller | Deleted |

### Open Issues

**Security**
- Upload magic-byte check only covers images; PDF, CSV, XML, and text files are not validated.
- Vault token has no expiry tracking or auto-refresh; a long-running instance could use an expired token silently.

**Incomplete Implementations**
- `PasswordResetToken` model exists but forgot-password / reset-password routes are not yet implemented.
- Group chat (`room:join` / `room:send`) — `ChatRoom` model not implemented; handlers removed pending proper implementation.

**Performance**
- `Notification` table has no TTL or cleanup job; old notifications accumulate indefinitely.
- `dataExportService` loads all user data into memory at once — could OOM for users with large datasets.

**Game**
- `AlpacaRoadMatch` and `SpitRoyaleMatch` trust client-reported position/hit data — a malicious client can spoof movement or spit hits.
- No heartbeat timeout to auto-close zombie matches (e.g., all players disconnect without `leave_room`).

**Minor / Code Quality**
- `proxy_read_timeout 86400` in Nginx is excessive for non-WebSocket API routes.

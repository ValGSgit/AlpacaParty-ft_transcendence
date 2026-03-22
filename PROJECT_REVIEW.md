# AlpacaParty - Product Owner Review & Project Walkthrough

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mandatory Requirements Compliance](#2-mandatory-requirements-compliance)
3. [Module Compliance Analysis](#3-module-compliance-analysis)
4. [How the Project Works - Step by Step](#4-how-the-project-works---step-by-step)
5. [Critical Issues & Risks](#5-critical-issues--risks)
6. [Recommendations](#6-recommendations)

---

## 1. Executive Summary

**AlpacaParty** is a full-stack social gaming platform built with Vue 3, Express.js, PostgreSQL, and Three.js. Users raise virtual alpacas in a 3D farm environment, interact via real-time messaging, earn achievements, and engage in a social feed. The application is containerized with Docker, secured with ModSecurity WAF + HashiCorp Vault, and served over HTTPS via Nginx.

**Team**: 4 members (ValGSgit, DavidPoetsch, fankahou, LukasStefanek)

### Module Points Claimed vs. Validated

| Status | Category | Module | Points | Verdict |
|--------|----------|--------|--------|---------|
| PASS | Web | Frontend + Backend frameworks (Vue + Express) | 2 (Major) | Fully implemented |
| PASS | Web | Real-time features (Socket.IO) | 2 (Major) | Fully implemented |
| PASS | Web | User interaction (chat, profiles, friends) | 2 (Major) | Fully implemented |
| WARN | Web | Public API (secured, rate-limited, documented) | 2 (Major) | Implemented but documentation page needs verification |
| PASS | Web | ORM (Prisma) | 1 (Minor) | Fully implemented |
| PASS | Web | Notification system | 1 (Minor) | Fully implemented |
| PASS | Web | File upload and management | 1 (Minor) | Fully implemented |
| PASS | User Mgmt | Standard user management (profile, avatar, friends, online status) | 2 (Major) | Fully implemented |
| PASS | User Mgmt | OAuth 2.0 (Google, GitHub) | 1 (Minor) | Fully implemented |
| PASS | User Mgmt | GDPR compliance | 1 (Minor) | Export (JSON/CSV/XML) + deletion implemented |
| PASS | Cybersecurity | WAF/ModSecurity + HashiCorp Vault | 2 (Major) | Fully implemented |
| WARN | AI | LLM system interface (Groq/Llama) | 2 (Major) | Chat works, streaming endpoint exists, rate limiting via global middleware only |
| PASS | Gaming | Gamification system (achievements, XP, levels, leaderboard) | 1 (Minor) | Fully implemented (6+ features) |
| WARN | Gaming | Web-based game (Alpaca Farm) | 2 (Major) | Farm exists but lacks PvP win/loss conditions |
| WARN | User Mgmt | Game statistics & match history | 1 (Minor) | Backend ready, but depends on a competitive game being functional |

**Solid Points: ~18 points** (above the 14-point requirement)
**At-Risk Points: ~5 points** (need fixes to be validated)
**Not claiming: 2FA** (removed from scope)

---

## 2. Mandatory Requirements Compliance

### III.2 General Requirements

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Web application with frontend, backend, and database | PASS | Vue 3 frontend, Express.js backend, PostgreSQL database |
| Git with clear, meaningful commits from all members | PASS | Commit history shows contributions from all 4 team members |
| Containerized deployment with single command | PASS | `docker-compose.yml` + `docker-compose.prod.yml`, run via `make up` or `make prod-up` |
| Compatible with latest stable Google Chrome | PASS | Vue 3 + Vite targets ES2020+, Three.js uses WebGL |
| No warnings/errors in browser console | NEEDS TESTING | Must be verified during evaluation |
| Privacy Policy page | PASS | `PrivacyPolicy.vue` at `/privacy` route, contains relevant content |
| Terms of Service page | PASS | `TermsOfService.vue` at `/terms` route, contains relevant content |
| Multi-user simultaneous support | PASS | Socket.IO handles concurrent connections, JWT-based sessions, database transactions |
| Real-time updates across connected users | PASS | Socket.IO broadcasts presence, messages, notifications |
| No data corruption with simultaneous actions | PASS | PostgreSQL ACID compliance, Prisma transactions |

### III.3 Technical Requirements

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Clear, responsive, accessible frontend | PASS | CSS custom properties, responsive layouts, semantic HTML |
| CSS framework/styling solution | PASS | Custom CSS with scoped styles, consistent design system |
| Credentials in .env, ignored by git, .env.example provided | PASS | `.env.example` exists, `.env` in `.gitignore` |
| Database with clear schema and relations | PASS | 23 tables in PostgreSQL, Prisma schema with proper relations |
| Basic user management (sign up, log in, hashed passwords) | PASS | bcrypt with 12 salt rounds, email+password auth |
| Form/input validation (frontend + backend) | PASS | Backend validation in controllers, frontend form validation |
| HTTPS everywhere for backend | PASS | Express uses HTTPS with self-signed certs, Nginx proxies with SSL |

---

## 3. Module Compliance Analysis

### 3.1 Web Modules

#### MAJOR: Frontend + Backend Frameworks (2 pts) - PASS

- **Frontend**: Vue 3 with Composition API, Vue Router 4, Pinia state management, Vite build tool
- **Backend**: Express.js 4.21 with structured MVC architecture (controllers, models, services, routes, middleware)
- **Evidence**: `frontend/package.json` (vue 3.5.13), `backend/package.json` (express 4.21.2)

#### MAJOR: Real-time Features via WebSockets (2 pts) - PASS

- **Technology**: Socket.IO 4.8 (server + client)
- **Features implemented**:
  - Real-time direct messaging (`dm:send` / `dm:message` events)
  - Group chat rooms (`room:join` / `room:message` events)
  - User presence tracking (online/offline status broadcast)
  - Real-time notifications (`notification` event to `user:{id}` rooms)
  - Game state updates (ELO recalculation on game finish)
- **Connection handling**: Connection state recovery enabled, authentication via JWT on handshake
- **Evidence**: `backend/src/services/socketService.js`

#### MAJOR: User Interaction (2 pts) - PASS

The subject requires: basic chat, profile system, friends system.

- **Chat system**: Direct messages stored in `messages` table, group chat rooms with roles (owner/admin/member), real-time via Socket.IO. UI in `Messages.vue`.
- **Profile system**: User profiles with avatar, bio, status, online indicator. Public profiles at `/user/:id`. Settings page for editing.
- **Friends system**: Send/accept/decline friend requests, remove friends, block users, see online friends. Full CRUD via `/api/friends/*` endpoints.
- **Evidence**: `chatController.js`, `friendController.js`, `userController.js`, `Messages.vue`, `Friends.vue`

#### MAJOR: Public API (2 pts) - WARNING

The subject requires: secured API key, rate limiting, documentation, at least 5 endpoints (GET, POST, PUT, DELETE).

- **API Key**: `X-API-Key` header validated by `apiKey.js` middleware
- **Rate Limiting**: 30 requests/minute via `express-rate-limit`
- **Endpoints implemented**:
  - `GET /api/public/users` - List public users (with search, pagination)
  - `GET /api/public/users/:id` - Get specific user profile
  - `GET /api/public/leaderboard` - Game leaderboard
  - `GET /api/public/posts` - Public feed posts
  - `POST /api/public/posts` - Create post
  - `PUT /api/public/posts/:id` - Update post
  - `DELETE /api/public/posts/:id` - Delete post
  - `GET /api/public/organizations` - List organizations
  - `GET /api/public/mock` - Mock dataset
- **Anonymization**: `?anonymized=true` query parameter supported
- **Risk**: Documentation endpoint/page not found. The subject requires "documentation" - verify if API docs are accessible somewhere.
- **Evidence**: `publicApiController.js`, `apiKey.js`, `publicRoutes.js`

#### MINOR: ORM (1 pt) - PASS

- **Technology**: Prisma 7.4 with PostgreSQL adapter
- **Schema**: `prisma/schema.prisma` defines all 23 tables with proper relations
- **Migrations**: Managed via Prisma CLI (`npx prisma migrate`)
- **Evidence**: `backend/prisma/schema.prisma`, all model files use Prisma client

#### MINOR: Notification System (1 pt) - PASS

- **Types**: friend_request, friend_accepted, game_invite, message, post_like, achievement, org_invite
- **Storage**: `notifications` table (type, title, message, reference_type, reference_id, is_read)
- **Real-time**: Socket.IO `notification` event broadcast to user's personal room
- **CRUD**: Create on actions, mark as read, delete notifications
- **Evidence**: `notificationService.js`, `notificationController.js`, `Notification.js`

#### MINOR: File Upload and Management (1 pt) - PASS

- **Technology**: Multer middleware
- **Features**:
  - Multiple file type support (images, documents)
  - Server-side validation (type, size: 10MB max, format)
  - Secure storage in `uploads/` directory with access control
  - File metadata in `files` table (filename, original_name, size_bytes, mime_type)
  - Upload endpoint: `POST /api/uploads`
  - List user files: `GET /api/uploads`
  - Delete file: `DELETE /api/uploads/:id`
- **BigInt fix**: `safeFile()` wrapper converts BigInt size to Number for JSON serialization
- **Evidence**: `uploadController.js`, `File.js`

---

### 3.2 User Management Modules

#### MAJOR: Standard User Management (2 pts) - PASS

The subject requires: update profile, upload avatar (with default), add friends + online status, profile page.

- **Profile updates**: `PUT /api/users/me` - username, bio, avatar, status, privacy settings
- **Avatar**: Upload via file system or generate via AI. Default avatar provided if none set.
- **Friends + online status**: Full friend system with online/offline tracking via Socket.IO presence
- **Profile page**: `Profile.vue` (own profile), `UserProfile.vue` (other users at `/user/:id`)
- **Evidence**: `userController.js`, `friendController.js`, `Profile.vue`, `UserProfile.vue`

#### MINOR: OAuth 2.0 (1 pt) - PASS

- **Providers**: Google and GitHub via Passport.js strategies
- **Flow**: OAuth redirect → callback → JWT token generation → frontend redirect with tokens
- **Account linking**: If OAuth email matches existing local account, accounts are linked
- **Achievement**: First login unlocks `first_login` achievement
- **Evidence**: `oauthService.js`, `authController.js`, `OAuthCallback.vue`

#### MINOR: 2FA (1 pt) - FAIL

- **Status**: `two_factor_secret` field exists in users table schema, `SecurityDashboard.vue` exists as a frontend page, but the actual TOTP/2FA logic is NOT implemented in the backend controllers or services.
- **Missing**: No TOTP generation, no QR code endpoint, no verification endpoint, no recovery codes
- **Verdict**: Cannot be claimed. This module is non-functional.

#### MINOR: Game Statistics & Match History (1 pt) - WARNING

- **Backend**: `game_stats` table (wins, losses, draws, elo per game_type), `games` table (match history), endpoints for stats/history/leaderboard/achievements all exist
- **Risk**: This module requires a functional competitive game. The alpaca farm is not a PvP game with win/loss conditions. If a competitive game (e.g., Pong) is not implemented, this module cannot be validated.
- **Evidence**: `gameController.js`, `Game.js` model

---

### 3.3 Cybersecurity Module

#### MAJOR: WAF/ModSecurity + HashiCorp Vault (2 pts) - PASS

- **ModSecurity**: nginx container built on `owasp/modsecurity-crs:4-nginx-202411100904` image. Rule engine ON, anomaly scoring (inbound: 10, outbound: 4). Custom rule exclusions in `modsecurity/` directory.
- **Vault**: HashiCorp Vault running in dev mode. KV v2 secrets engine at `secret/data/alpacaparty`. Initialization script seeds secrets (DB credentials, JWT secret, API keys, OAuth secrets). Backend loads secrets from Vault before starting (`server.js` → `vault.js` → `index.js`).
- **Risk for evaluation**: Vault runs in dev mode (unsealed, root token). The subject says "encrypted and isolated" - dev mode stores in-memory only. If evaluators check Vault configuration strictly, this could be flagged. Consider explaining this is for development and that production would use proper unsealing.
- **Evidence**: `nginx/Dockerfile`, `nginx/modsecurity/`, `vault/init/`, `backend/src/config/vault.js`

---

### 3.4 AI Modules

#### MAJOR: LLM System Interface (2 pts) - WARNING

The subject requires: generate text/images based on user input, handle streaming responses, error handling and rate limiting.

- **Text generation**: Groq API with Llama 3.3-70B model. Help desk chatbot at `/api/help/chat`. System prompt defines an alpaca-themed assistant.
- **Streaming**: `POST /api/help/chat/stream` endpoint uses Server-Sent Events (SSE). Frontend `Help.vue` consumes the stream.
- **Error handling**: Try/catch blocks, fallback error messages
- **Rate limiting**: Global rate limiter (1000/15min) applies, but no specific LLM rate limiter
- **Image generation**: Placeholder endpoints exist (`/api/users/me/generate-avatar`, `/api/users/me/generate-image`) but Hugging Face integration is NOT fully functional
- **Risk**: The subject says "Generate text AND/OR images" - text-only may suffice, but evaluators might expect both. The streaming implementation should be demonstrated working.
- **Evidence**: `helpController.js`, `Help.vue`

---

### 3.5 Gaming Modules

#### MAJOR: Web-based Game (2 pts) - WARNING

The subject requires: a game where users can play against each other, live matches, clear rules and win/loss conditions.

- **Current implementation**: 3D Alpaca Farm built with Three.js. Features include:
  - 3D world rendering with camera modes (topdown, perspective, orthographic)
  - Alpaca models with customizable colors and speed traits
  - Farm editor (drag-and-drop objects)
  - Coin collection and shop system
  - Save/load farm state to backend
- **Critical gap**: The alpaca farm is a **sandbox/simulation**, NOT a competitive game. There are no PvP mechanics, no live matches between players, and no clear win/loss conditions. The backend has game infrastructure (ELO, match history, leaderboard) but no actual competitive game logic.
- **Impact**: Without a competitive game, the following modules CANNOT be claimed:
  - Game Statistics & Match History (requires a game)
  - AI Opponent (requires a game)
  - Tournament System (requires a game)
  - Remote Players (requires a game)
  - Spectator Mode (requires a game)
- **Verdict**: The farm is impressive technically but does not meet the subject's definition of a "game where users can play against each other." A competitive game (Pong, etc.) needs to be implemented or the farm needs PvP mechanics added.

#### MINOR: Gamification System (1 pt) - PASS

The subject requires at least 3 of: achievements, badges, leaderboards, XP/level system, daily challenges, rewards.

- **Achievements**: 8+ achievements (first_login, first_win, first_post, social_butterfly, level_10, org_founder, etc.) with XP rewards
- **XP/Level system**: XP awarded for actions (wins: 25, losses: 5, draws: 10, posts: 5). Level = XP/100.
- **Leaderboard**: ELO-based leaderboard at `/api/game/leaderboard`
- **Daily challenges**: `daily_challenges` table with user progress tracking
- **Visual feedback**: Notifications on achievement unlock, XP display in profile
- **Persistence**: All stored in database (achievements, user_achievements, daily_challenges tables)
- **Evidence**: `gamificationService.js`, `Achievement.js`, `gameController.js`

---

### 3.6 Data & Analytics Module

#### MINOR: GDPR Compliance (1 pt) - PASS

- **Data export**: `GET /api/users/me/export?format=json|csv|xml` exports user profile, posts, friends, game history, achievements, messages
- **Account deletion**: `DELETE /api/users/me` or formal request via `POST /api/users/me/delete-request`
- **Admin processing**: Admin dashboard shows pending data requests, admin can process export/delete
- **Privacy Policy**: Accessible at `/privacy`
- **Evidence**: `dataExportService.js`, `adminController.js`, `DataRequest.js`

---

### 3.7 Module Points Summary

| Module | Points | Status |
|--------|--------|--------|
| Web: Frontend + Backend Frameworks | 2 | VALIDATED |
| Web: Real-time Features (WebSocket) | 2 | VALIDATED |
| Web: User Interaction (chat, profiles, friends) | 2 | VALIDATED |
| Web: Public API | 2 | NEEDS API DOCS |
| Web: ORM (Prisma) | 1 | VALIDATED |
| Web: Notification System | 1 | VALIDATED |
| Web: File Upload | 1 | VALIDATED |
| User Mgmt: Standard User Management | 2 | VALIDATED |
| User Mgmt: OAuth 2.0 | 1 | VALIDATED |
| User Mgmt: 2FA | 1 | FAILED |
| User Mgmt: Game Statistics | 1 | NEEDS COMPETITIVE GAME |
| Cybersecurity: WAF + Vault | 2 | VALIDATED |
| AI: LLM System Interface | 2 | NEEDS DEMO VERIFICATION |
| Gaming: Web-based Game | 2 | NEEDS PVP MECHANICS |
| Gaming: Gamification | 1 | VALIDATED |
| Data: GDPR Compliance | 1 | VALIDATED |

**Validated total: 18 points** (above the 14-point minimum)
**At-risk total: 7 points** (need fixes or verification)
**Failed total: 1 point** (2FA)

---

## 4. How the Project Works - Step by Step

### 4.1 Infrastructure & Deployment

#### Step 1: Starting the Application

The entire application runs via Docker Compose. A single command starts all services:

```bash
make up          # Development
make prod-up     # Production
```

**Docker Compose orchestrates 6 services:**

1. **PostgreSQL 16** (database) - Listens on port 5432. On first start, executes `PostgreSQL/init.sql` which creates all 23 tables, indexes, and seed data (including default achievements and daily challenges).

2. **HashiCorp Vault** (secret management) - Runs in dev mode on port 8200. The `vault-init` sidecar container runs `vault/init/init-vault.sh` to seed secrets (DB credentials, JWT secret, OAuth client IDs/secrets, API keys, Groq API key, Hugging Face key) into Vault's KV v2 engine at `secret/data/alpacaparty`.

3. **Backend (Express.js)** - Starts via `server.js` which:
   - Calls `loadVaultSecrets()` from `config/vault.js` to pull secrets from Vault
   - Falls back to `.env` values if Vault is unavailable
   - Then imports and starts `index.js` which initializes Express with all middleware, routes, and Socket.IO

4. **Frontend (Vue 3)** - In development: Vite dev server on port 5173 with HMR. In production: Static build served by Nginx.

5. **Nginx** (reverse proxy + WAF) - Listens on port 8443 (HTTPS). Routes:
   - `/api/*` and `/socket.io/*` → proxied to backend:3000
   - Everything else → proxied to frontend:5173
   - ModSecurity WAF inspects all requests using OWASP Core Rule Set v4

6. **E2E Tests** (Playwright) - On-demand profile for end-to-end testing.

#### Step 2: SSL/TLS Configuration

- Nginx uses self-signed certificates from `nginx/ssl/` directory
- Backend also loads SSL certificates for direct HTTPS (Express HTTPS server)
- HTTP (port 8080) redirects to HTTPS (port 8443)
- Security headers set by Nginx: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

#### Step 3: WAF Protection

Every incoming request passes through ModSecurity v3:
- OWASP Core Rule Set v4 evaluates requests against known attack patterns (SQL injection, XSS, path traversal, etc.)
- Anomaly scoring mode: requests accumulate a "score" for each rule violation. If score exceeds threshold (inbound: 10, outbound: 4), the request is blocked.
- Custom exclusions in `nginx/modsecurity/` tune rules to avoid false positives on legitimate API calls.

---

### 4.2 Authentication Flow

#### Step 4: User Registration

1. User fills registration form in `Register.vue` (username, email, password)
2. Frontend validates: password minimum 8 chars, 1 uppercase, 1 lowercase, 1 number
3. `POST /api/auth/register` sent to backend
4. `authController.register()`:
   - Validates input fields (non-empty, email format)
   - Checks username and email uniqueness in database
   - Hashes password with bcrypt (12 salt rounds)
   - Creates user record in `users` table via Prisma
   - Generates JWT access token (24h expiry) and refresh token (7d expiry)
   - Returns tokens + user object to frontend
5. Frontend stores tokens in `localStorage`, updates Pinia auth store
6. `gamificationService.checkAndUnlock(userId, 'first_login')` awards the First Login achievement (10 XP)

#### Step 5: User Login

1. User enters credentials in `Login.vue`
2. `POST /api/auth/login` sent to backend
3. `authController.login()`:
   - Finds user by username in database
   - Compares password with stored hash via `bcrypt.compare()`
   - If match: generates new JWT tokens, updates `is_online` status
   - Returns tokens + user object
4. Frontend stores tokens, redirects to home/profile

#### Step 6: OAuth Login (Google/GitHub)

1. User clicks "Login with Google" or "Login with GitHub"
2. Frontend redirects to `GET /api/auth/google` or `GET /api/auth/github`
3. Passport.js redirects to provider's authorization page
4. User grants permission, provider redirects back to callback URL
5. `oauthService.js` Passport strategy:
   - Extracts profile info (email, name, avatar) from OAuth response
   - Checks if user exists with matching `oauth_provider` + `oauth_id`
   - If no match but email matches existing local account: links OAuth to that account
   - If completely new: creates new user with OAuth data (no password needed)
6. `authController.oauthCallback()` generates JWT tokens
7. Redirects to frontend `/oauth-callback?accessToken=...&refreshToken=...`
8. `OAuthCallback.vue` extracts tokens from URL, stores them, redirects to profile

#### Step 7: JWT Token Lifecycle

- **Access token**: Included in every API request as `Authorization: Bearer <token>`. Expires in 24 hours.
- **Refresh token**: Used to obtain new access token when expired. Expires in 7 days.
- **Auto-refresh**: Axios response interceptor in `services/api.js` catches 401 errors, sends refresh token to `POST /api/auth/refresh`, receives new access token, retries original request.
- **Logout**: `POST /api/auth/logout` clears server-side session, frontend removes tokens from localStorage.

---

### 4.3 Real-time Connection (Socket.IO)

#### Step 8: WebSocket Connection

1. After login, frontend connects to Socket.IO server
2. Client sends JWT token during handshake for authentication
3. Server validates token in `socketService.js` connection handler
4. User joins personal room `user:{userId}` for targeted events
5. Server broadcasts `presence` event to all connected users (user is now online)
6. On disconnect: `is_online` set to false, `last_seen` updated, offline presence broadcast

#### Step 9: Real-time Event System

The Socket.IO server handles these event categories:

**Presence Events:**
- `presence` → Broadcast when user comes online/goes offline
- Other users' friend lists and chat interfaces update in real-time

**Direct Message Events:**
- `dm:send` → Client sends a DM (receiverId, content)
- Server creates message record in database
- Server emits `dm:message` to both sender and receiver's rooms
- Notification created and broadcast to receiver

**Group Chat Events:**
- `room:join` → Client joins a chat room
- `room:message` → Client sends message to room
- Server stores message, broadcasts to all room members

**Notification Events:**
- `notification` → Server pushes to specific user's room
- Types: friend_request, friend_accepted, game_invite, post_like, achievement, etc.

**Game Events:**
- `game:create` → Create a new game session
- `game:join` → Join existing game
- `game:finish` → Record results, update ELO, award XP

---

### 4.4 User Profile & Social Features

#### Step 10: Profile Management

- **View own profile**: `GET /api/users/me` returns full user data (username, email, bio, avatar, XP, level, coins, alpacas, items, achievements)
- **Edit profile**: `PUT /api/users/me` updates any field (username, bio, avatar, status, privacy settings)
- **View other profiles**: `GET /api/users/:id` returns public profile data (respects `is_public` flag)
- **Avatar**: Upload via file upload system or generate with AI. Default avatar if none set.
- **Settings page**: `Settings.vue` provides forms for profile editing, password change, privacy toggle, GDPR data export/deletion

#### Step 11: Friends System

1. **Send request**: `POST /api/friends/requests` with `receiverId` → creates `friend_request` record (status: pending) → notification sent to receiver
2. **View requests**: `GET /api/friends/requests` returns both sent and received pending requests
3. **Accept request**: `PUT /api/friends/requests/:id/accept` → creates mutual entries in `friends` table → notification to sender
4. **Decline request**: `PUT /api/friends/requests/:id/decline` → updates status to declined
5. **Remove friend**: `DELETE /api/friends/:id` → removes both directions from `friends` table
6. **Block user**: `POST /api/friends/block` → adds to `blocked_users` → removes from friends if exists
7. **Online friends**: `GET /api/friends/online` → returns friends where `is_online = true`

#### Step 12: Social Feed

1. **Create post**: `POST /api/posts` with content and optional image → creates `posts` record → gamification check (first_post achievement, 5 XP)
2. **View feed**: `GET /api/posts/feed` returns posts from friends + own posts, paginated
3. **Like post**: `POST /api/posts/:id/like` → toggles like in `post_likes` table → updates `likes_count` → notification to author
4. **Edit/Delete**: `PUT /api/posts/:id`, `DELETE /api/posts/:id` (own posts only)
5. **UI**: `Feed.vue` displays posts using `PostCard.vue` component with author info, content, like button, timestamp

---

### 4.5 Messaging System

#### Step 13: Direct Messages

1. User navigates to `Messages.vue`
2. Sidebar shows conversation list (fetched via `GET /api/chat/conversations`)
3. Each conversation shows last message preview and unread count
4. Clicking a conversation loads message history (`GET /api/chat/messages/:userId`)
5. Sending a message:
   - Frontend emits `dm:send` via Socket.IO with receiverId and content
   - Backend creates message record in `messages` table
   - Backend emits `dm:message` to both users' rooms
   - Message appears in real-time on both sides
   - Backend creates notification for receiver
6. Messages marked as read when conversation is opened (`PUT /api/chat/messages/:id/read`)

#### Step 14: Group Chat Rooms

1. **Create room**: `POST /api/chat/rooms` with name and optional members
2. **Join room**: Socket.IO `room:join` event
3. **Send message**: Socket.IO `room:message` event → stored in `chat_room_messages` → broadcast to all members
4. **Member management**: Add/remove members, roles (owner/admin/member)
5. **Room list**: `GET /api/chat/rooms` returns user's rooms with member counts

---

### 4.6 3D Alpaca Farm Game

#### Step 15: Game Initialization

1. User navigates to `/game` route
2. `Game.vue` component mounts and initializes the Three.js engine:
   - `useGameEngine.js`: Creates THREE.Scene, PerspectiveCamera, WebGLRenderer, ambient + directional lights
   - `initWorld.js`: Generates the farm terrain (ground plane, grass, sky)
   - `useCamera.js`: Sets up camera controls (orbit, pan, zoom)
   - `useInput.js`: Registers keyboard and mouse event listeners
   - `usePhysics.js`: Initializes physics simulation (gravity, collision detection)

3. **Load user's farm**:
   - `GET /api/game/farm` fetches saved farm data from `alpaca_farms` table (JSONB)
   - `saveLoadGame.js` deserializes: alpaca positions/colors, placed items, coins, upgrades
   - If no saved farm: initializes default farm with starter alpaca

#### Step 16: Gameplay Loop

The game runs a continuous render loop (`requestAnimationFrame`):

1. **Input processing**: `useInput.js` reads keyboard state (WASD movement, space for actions)
2. **Physics update**: `usePhysics.js` applies gravity, resolves collisions between entities
3. **Animation update**: `useAnimation.js` updates alpaca skeleton animations (idle, walk, eat)
4. **Player controls**: `usePlayerControls.js` moves player avatar based on input
5. **Camera update**: `useCamera.js` follows player or maintains fixed view based on mode
6. **Render**: Three.js renders the scene to canvas

#### Step 17: Farm Interactions

- **Alpaca management**: `alpacaHandling.js` handles selection, customization (color picker: original/black/grey/white/custom hex), speed trait adjustment
- **Shop system**: `shop.js` presents buyable items (new alpacas, decorations, farm upgrades). Costs coins. UI overlay in `Game.vue`.
- **Coin collection**: `coins.js` spawns collectible coins in the farm world. Player walks over them to collect. Coins persist in user profile.
- **Farm editor**: `editMode.js` enables drag-and-drop placement of objects (trees, fences, decorations). Toggle via UI button.
- **Item spawning**: `spawnItems.js` procedurally generates trees, rocks, and decorations in the world

#### Step 18: Farm Persistence

- **Auto-save**: Farm state saved periodically to backend
- **Manual save**: Button in UI triggers `POST /api/game/farm` with serialized farm data (JSONB)
- **Data structure**: `{ alpacas: [...], items: [...], coins: number, upgrades: {...} }`
- **Load**: On game start, `GET /api/game/farm` restores exact state

---

### 4.7 Gamification & Progression

#### Step 19: Achievement System

1. Actions trigger achievement checks via `gamificationService.js`:
   - First login → `first_login` (10 XP)
   - First game win → `first_win` (50 XP)
   - First post → `first_post` (5 XP)
   - 10+ friends → `social_butterfly` (100 XP)
   - Reach level 10 → `level_10` (200 XP)
   - Create organization → `org_founder` (150 XP)
2. `Achievement.unlock(userId, key)`:
   - Checks if already unlocked (idempotent)
   - Creates `user_achievements` record with `unlocked_at` timestamp
   - Awards XP to user
   - Creates notification (type: achievement)
   - Broadcasts notification via Socket.IO

#### Step 20: XP & Leveling

- XP earned from: game wins (25), losses (5), draws (10), posts (5), achievements (variable)
- Level calculation: `level = floor(xp / 100)`
- Level milestones trigger achievement checks (level 10 → `level_10` achievement)
- XP and level displayed on user profile

#### Step 21: ELO Rating System

- Default ELO: 1000 for new players
- K-factor: 32
- Calculation (on game finish):
  ```
  expected = 1 / (1 + 10^((opponentElo - playerElo) / 400))
  newElo = currentElo + 32 * (score - expected)
  ```
  where score = 1 (win), 0.5 (draw), 0 (loss)
- Stored per game type in `game_stats` table
- Leaderboard sorts by ELO descending

---

### 4.8 Notification System

#### Step 22: Notification Flow

1. **Trigger**: An action occurs (friend request sent, post liked, achievement unlocked, etc.)
2. **Create**: `notificationService.create()` inserts record in `notifications` table with type, title, message, reference_type, reference_id
3. **Broadcast**: Socket.IO emits `notification` event to `user:{targetUserId}` room
4. **Frontend receive**: Vue component listens for `notification` event, updates notification badge count
5. **View**: User opens notification panel, `GET /api/notifications` fetches all notifications (paginated)
6. **Mark read**: `PUT /api/notifications/:id/read` updates `is_read` flag
7. **Delete**: `DELETE /api/notifications/:id` removes notification

**Notification Types:**
| Type | Trigger |
|------|---------|
| `friend_request` | Someone sends a friend request |
| `friend_accepted` | Friend request accepted |
| `game_invite` | Invited to play a game |
| `message` | New direct message received |
| `post_like` | Someone liked your post |
| `achievement` | Achievement unlocked |
| `org_invite` | Invited to join organization |

---

### 4.9 Organizations

#### Step 23: Organization Management

1. **Create**: `POST /api/organizations` with name → creates `organizations` record, creator becomes owner → `org_founder` achievement check
2. **View**: `GET /api/organizations` lists all public orgs (with search)
3. **Members**: Owner can add (`POST /api/organizations/:id/members`) or remove (`DELETE /api/organizations/:id/members/:userId`) members
4. **Roles**: owner, admin, member — stored in `organization_members` table
5. **Privacy**: `is_public` flag controls visibility
6. **Delete**: `DELETE /api/organizations/:id` (owner only)

---

### 4.10 Admin Dashboard

#### Step 24: Admin Operations

Access: Requires `is_admin = true` (set via `make seed-admins` or `PUT /api/admin/users/:id/toggle-admin`)

1. **Site stats**: `GET /api/admin/stats` returns total users, games played, posts, active users, etc.
2. **User management**: `GET /api/admin/users` with pagination. Admin can view all users, delete users (`DELETE /api/admin/users/:id`), toggle admin role.
3. **GDPR requests**: `GET /api/admin/data-requests` shows pending export/delete requests. `POST /api/admin/data-requests/:id/process` executes the request (generates export file or deletes user data).

---

### 4.11 AI Help Desk

#### Step 25: LLM Chat Interface

1. User navigates to `Help.vue`
2. Types a question in the chat input
3. **Non-streaming**: `POST /api/help/chat` sends conversation history (last 20 messages) to Groq API (Llama 3.3-70B) → returns complete response
4. **Streaming**: `POST /api/help/chat/stream` uses Server-Sent Events (SSE) → tokens arrive incrementally → frontend renders them as they arrive
5. System prompt configures the AI as an alpaca-themed support assistant with knowledge of the platform
6. Configuration: max_tokens=1024, temperature=0.7

---

### 4.12 Public API

#### Step 26: External API Access

1. API consumer obtains an API key (stored in Vault/env)
2. Every request must include `X-API-Key: <key>` header
3. Rate limited to 30 requests/minute per IP
4. All endpoints support `?anonymized=true` to hash usernames and hide emails
5. Available operations:
   - **Read users**: `GET /api/public/users?search=&limit=20&offset=0`
   - **Read user**: `GET /api/public/users/:id`
   - **Read leaderboard**: `GET /api/public/leaderboard?gameType=pong&limit=20`
   - **Read posts**: `GET /api/public/posts?limit=20`
   - **Create post**: `POST /api/public/posts`
   - **Update post**: `PUT /api/public/posts/:id`
   - **Delete post**: `DELETE /api/public/posts/:id`
   - **Read organizations**: `GET /api/public/organizations?search=&limit=20`

---

### 4.13 GDPR & Data Export

#### Step 27: User Data Rights

1. **Export data**: User goes to Settings → clicks "Export My Data" → selects format (JSON, CSV, or XML)
   - `GET /api/users/me/export?format=json` triggers `dataExportService.js`
   - Collects: user profile, posts, friends, game history, achievements, messages
   - Returns formatted file for download

2. **Delete account**: User goes to Settings → clicks "Delete Account" → confirmation dialog
   - `DELETE /api/users/me` or `POST /api/users/me/delete-request` for admin-processed deletion
   - Cascading delete: removes user data, posts, messages, friendships, game records
   - Admin can process batch requests via dashboard

---

### 4.14 Security Architecture

#### Step 28: Request Lifecycle (Security Perspective)

A typical API request passes through these security layers:

```
Client (HTTPS) → Nginx (SSL termination, HSTS, security headers)
    → ModSecurity WAF (OWASP CRS rule evaluation, anomaly scoring)
    → Express.js (Helmet headers, CORS check, rate limiting)
    → Route-specific middleware (JWT auth, admin check, API key validation)
    → Controller (input validation, authorization checks)
    → Prisma ORM (parameterized queries, preventing SQL injection)
    → PostgreSQL (row-level data access)
```

**Defense in depth:**
- Layer 1: TLS encryption (data in transit)
- Layer 2: WAF blocks known attack patterns
- Layer 3: Rate limiting prevents abuse
- Layer 4: JWT authentication verifies identity
- Layer 5: Role-based authorization controls access
- Layer 6: Input validation prevents malformed data
- Layer 7: Parameterized queries prevent injection
- Layer 8: Vault manages secrets (no hardcoded credentials)

---

## 5. Critical Issues & Risks

### 5.1 BLOCKER: No Competitive PvP Game

**Impact**: HIGH

The alpaca farm is a single-player sandbox simulation. The subject's "Gaming and user experience" module requires:
> "a complete web-based game where users can play against each other... Players must be able to play live matches... The game must have clear rules and win/loss conditions."

Without a competitive game:
- The "Web-based game" major module (2 pts) cannot be validated
- "Game Statistics & Match History" minor module (1 pt) cannot be validated
- The backend game infrastructure (ELO, matchmaking, leaderboard) is unused
- All other gaming modules (AI Opponent, Tournament, Remote Players, Spectator) are blocked

**Recommendation**: Implement a competitive game (Pong is the classic choice). The backend infrastructure (ELO, game sessions, Socket.IO game events) is already built. A Pong client using Canvas2D or Three.js can be added with moderate effort, leveraging existing Socket.IO game events.

### 5.2 RISK: 2FA Not Implemented

**Impact**: LOW (1 point)

The database schema has `two_factor_secret` field and `SecurityDashboard.vue` exists, but no actual TOTP implementation. If this module was claimed in the README, it must be either implemented or removed from the module list.

### 5.3 RISK: Public API Documentation Missing

**Impact**: MEDIUM

The subject requires the public API to have "documentation." No dedicated API documentation page (Swagger, OpenAPI spec, or similar) was found. The `ApiTest.vue` page exists for testing but may not constitute proper documentation.

**Recommendation**: Add a simple API documentation page listing all endpoints, parameters, and example responses. Alternatively, integrate Swagger/OpenAPI.

### 5.4 RISK: Vault Running in Dev Mode

**Impact**: LOW-MEDIUM

HashiCorp Vault runs in dev mode (unsealed, in-memory storage, root token). The subject says secrets should be "encrypted and isolated." Dev mode does not encrypt at rest.

**Recommendation**: Be prepared to explain during evaluation that dev mode is used for development/demonstration purposes and that production deployment would use proper Vault initialization with auto-unseal and persistent storage.

### 5.5 RISK: Browser Console Errors

**Impact**: MEDIUM

The subject states: "No warnings or errors should appear in the browser console." This must be verified by running the application and checking the Chrome DevTools console on all pages.

### 5.6 RISK: Multi-language Support Not Implemented

**Impact**: NONE (not claimed)

Multi-language support (i18n) is not implemented. This is fine as long as it's not listed in the claimed modules. Just noting it's a potential easy 1-point module to add.

---

## 6. Recommendations

### Priority 1: Implement a Competitive Game (Pong)

This unlocks 2+ additional module points and validates the existing backend game infrastructure. Steps:
1. Create a Pong game component using Canvas2D or Three.js
2. Wire it to existing Socket.IO game events (`game:create`, `game:join`, `game:finish`)
3. Use existing ELO calculation in `socketService.js`
4. Connect to existing game stats, leaderboard, and match history endpoints
5. This also enables claiming: AI Opponent, Tournament, Remote Players modules

### Priority 2: Add API Documentation

Create a simple documentation page for the public API to satisfy the "documentation" requirement. Can be a static page listing endpoints with examples.

### Priority 3: Remove 2FA from Claimed Modules

If 2FA is listed in the README's module list, either implement it fully or remove it. Non-functional modules = 0 points and could raise evaluator concerns.

### Priority 4: Test for Console Errors

Run the full application and navigate all pages while monitoring Chrome DevTools console. Fix any warnings or errors.

### Priority 5: Prepare Evaluation Talking Points

- Explain Vault dev mode vs. production configuration
- Demonstrate the WAF by showing blocked attack attempts in ModSecurity audit logs (`make waf-logs`)
- Show Socket.IO real-time features with two browser windows
- Walk through the GDPR data export flow
- Demonstrate OAuth login with Google/GitHub

---

*This review was conducted on 2026-03-20 by analyzing the full codebase against the ft_transcendence subject v21.0 requirements.*

# Points

**Required to pass: 14 points** — Major = 2 pts, Minor = 1 pt.
**AlpacaParty claims 25 points** (9 Major × 2 + 7 Minor × 1) — intentional headroom in case any module is contested at peer evaluation.

> This file is the authoritative claim ledger and must stay in sync with
> the module table in [`README.md`](README.md). When the two diverge, the
> README wins.

Legend:
- 🟢 **Major** module (2 pts)
- 🟡 **Minor** module (1 pt)
- ✅ Fully implemented and demonstrable
- 🚫 Not claimed (see notes at the bottom)

---

# 1. Web

### 🟢 Major: Use a framework for both the frontend and backend — ✅ 2 pts

- [x] Frontend framework: **Vue 3** (Composition API) + Vite + Vue Router + Pinia
- [x] Backend framework: **Express.js** (Node.js) with modular controller / service / route architecture

### 🟢 Major: Implement real-time features using WebSockets — ✅ 2 pts

- [x] Real-time updates across clients (Socket.IO, two namespaces: `/` for presence/DMs/notifications/group chat, `/minigames` for match lobbies and game state via `MatchManager`)
- [x] Graceful connection / disconnection handling (`socketAuthMiddleware` validates JWT cookies on every namespace; presence broadcasts on connect/disconnect; `connectionStateRecovery` enabled with a 30-second window)
- [x] Efficient broadcasting via rooms (DMs, group chats, match rooms, presence)

### 🟢 Major: Allow users to interact with other users — ✅ 2 pts

- [x] Basic chat system — direct messaging + group chat rooms (typing indicators, read receipts, persistent history)
- [x] Profile system — public/private profile pages with stats, XP/level, online status
- [x] Friends system — send/accept/decline/cancel requests, list friends, block/unblock, real-time online status

### 🟢 Major: Public API with secured API key, rate limiting, documentation, and ≥ 5 endpoints — ✅ 2 pts

- [x] `GET /api/public/users`, `GET /api/public/users/:id`, `GET /api/public/posts`
- [x] `POST /api/public/posts`
- [x] `PUT /api/public/posts/:id`
- [x] `DELETE /api/public/posts/:id`
- [x] `X-API-Key` auth (hashed keys stored in `PublicApi` model, per-user)
- [x] Per-key rate limiting (30 req/min)
- [x] Interactive Swagger UI at `/api/docs` (OpenAPI 3)

### 🟡 Minor: Use an ORM for the database — ✅ 1 pt

- [x] **Prisma** with `@prisma/adapter-pg` across 22 models, with migrations and seed data

### 🟡 Minor: Complete notification system for create / update / delete actions — ✅ 1 pt

- [x] Notifications inserted on friend-request CRUD, post likes, comments, achievement unlocks, game invites
- [x] Pushed in real time via Socket.IO and persisted in the `Notification` table
- [x] Backed by `NotificationService` and the `/api/notifications` REST surface

### 🟡 Minor: File upload and management system — ✅ 1 pt

- [x] Multiple file types via `multer` (images + documents, MIME whitelist)
- [x] Client-side and server-side validation (type, size ≤ 10 MB, format)
- [x] Secure storage with hashed filenames; non-image downloads require auth
- [x] Image preview in the UI
- [x] Progress indicators during upload
- [x] Uploader-only delete

---

# 2. Accessibility and Internationalization

> No modules claimed in this category.

---

# 3. User Management

### 🟢 Major: Standard user management and authentication — ✅ 2 pts

- [x] Users can update profile information (username, email, bio, status, avatar)
- [x] Avatar upload with a default avatar served when none is uploaded
- [x] Add other users as friends, see their **online status** (tracked by `User.isOnline` + real-time presence over Socket.IO)
- [x] Profile page displays level, XP progress, achievements, stats, friends, online indicator

### 🟡 Minor: Game statistics and match history — ✅ 1 pt

- [x] `GET /api/game/stats` — per-game-type wins, losses, ELO, rank
- [x] `GET /api/game/history` — past matches with dates, opponents, results
- [x] `GET /api/game/achievements` — achievement progression
- [x] `GET /api/game/leaderboard` — ELO leaderboard (K = 32), with `ActiveLeaderboard.vue` UI

---

# 4. Artificial Intelligence

### 🟢 Major: Complete LLM system interface — ✅ 2 pts

- [x] `POST /api/helpdesk/chat` proxies user messages to the **Groq LLM API** (llama-3.x)
- [x] Backend holds and rotates the API keys (never exposed to the browser)
- [x] System prompt injects AlpacaParty's feature knowledge so the help desk is product-aware
- [x] Streaming responses to the floating `HelpDeskChat.vue` widget
- [x] Per-user rate limiting and structured error handling

---

# 5. Cybersecurity

> No modules claimed in this category. The subject's only Cybersecurity
> Major bundles **WAF/ModSecurity (hardened) + HashiCorp Vault** as a single
> 2-point module — both halves are required to claim it.
>
> **Vault has been removed entirely** from the codebase: there is no longer a
> `vault` service, `vault-init` bootstrap, or `lib/vault.js` / `fetchSecrets`
> client. Secrets are now read straight from the project-root `.env` file via
> Docker Compose's `env_file` directive (`make generate-secrets` randomizes
> them). Defending a live Vault demo required significant ops familiarity from
> every team member at evaluation, and with the project already at 25 points
> (11 above the 14-point bar) the indirection was net cost with no benefit.
>
> The **WAF half has also been removed**: production nginx is now built from
> the stock `nginx` image (see [`nginx/Dockerfile.prod`](nginx/Dockerfile.prod))
> and runs as a plain reverse proxy. The Major needs both WAF **and** Vault, so
> with neither in place this category is not claimed for points. Application-layer
> defenses (Helmet headers, per-user rate limiting, parameterised Prisma queries,
> upload validation) remain in place.

---

# 6. Gaming and User Experience

### 🟢 Major: Complete web-based game — ✅ 2 pts (Spit Royale)

- [x] Real-time multiplayer arena over Socket.IO (`/minigames` namespace)
- [x] Two players on separate computers play live; up to 10 players in a single arena
- [x] Live matches with clear rules and win/loss conditions (last alpaca standing)
- [x] 3D rendering via Three.js
- [x] Network latency and disconnections handled gracefully (`MatchManager` cleans up dropped players; Socket.IO `connectionStateRecovery` restores presence)

### 🟢 Major: Add another game with user history and matchmaking — ✅ 2 pts (Alpaca Road)

- [x] Second distinct game — real-time race over Socket.IO (`/minigames` namespace)
- [x] Supports up to 4 players racing concurrently; server-authoritative tick loop
- [x] History and statistics tracked independently (`Game.gameType = "alpaca_road"`, separate `GameStat` row per user per game type)
- [x] Matchmaking via `MatchManager` (pairs waiting players, instantiates `AlpacaRoadMatch`, runs its own tick loop)
- [x] Performance maintained: per-match tick isolation, no cross-match contention

### 🟢 Major: Advanced 3D graphics (Three.js) — ✅ 2 pts

- [x] Immersive 3D farm world with custom lighting and multiple cameras
- [x] Alpaca model rigging + animation, shop, building, edit mode
- [x] Smooth performance and interactive editing on the client side

### 🟡 Minor: Game customization options — ✅ 1 pt

- [x] Power-ups / special abilities in both games
- [x] Different maps / themes (arenas in Spit Royale, level variants in Alpaca Road)
- [x] Customizable game settings (rules, match length, power-up toggles)
- [x] Sensible defaults available; AI bot in Spit Royale plays under the same rule set as humans

### 🟡 Minor: Gamification system — ✅ 1 pt

Implements **5 of the 6** suggested mechanics (only need 3):

- [x] **Achievements** — `first_win`, `win_streak_5`, `level_10`, `social_butter` (10 friends), `first_post`, `org_founder`
- [x] **Leaderboards** — leaderboards by kills (Spit Royale), obstacles (Alpaca Road), and coins
- [x] **XP / level system** — XP for wins (with bonuses for accuracy, eliminations, powerups, survival time, flawless), losses, posts, challenges; auto level-up
- [x] **Daily challenges** — rotate daily, persisted completions per user
- [x] **Rewards** — coin economy for the farm, XP bonuses
- [x] Fully persistent in the database (`UserStats`, `Achievement`, `UserAchievement`, `DailyChallenge`, `UserDailyChallenge`, `AlpacaFarm.coins`)
- [x] Visual feedback — real-time notifications, XP progress bars, achievement unlock toasts
- [x] Clear rules and progression mechanics, documented in-app

---

# Point Total

| # | Module | Category | Type | Pts |
|---|--------|----------|------|-----|
| 1 | Frontend + Backend frameworks (Vue 3 + Express.js) | Web | Major | 2 |
| 2 | Real-time features (Socket.IO, 2 namespaces) | Web | Major | 2 |
| 3 | User interaction (chat + profile + friends) | Web | Major | 2 |
| 4 | Public API (6 endpoints, key + rate limit + Swagger) | Web | Major | 2 |
| 5 | ORM (Prisma, 22 models) | Web | Minor | 1 |
| 6 | Notification system | Web | Minor | 1 |
| 7 | File upload and management | Web | Minor | 1 |
| 8 | Standard user management + authentication | User Mgmt | Major | 2 |
| 9 | Game statistics & match history | User Mgmt | Minor | 1 |
| 10 | LLM system interface (Groq help desk) | AI | Major | 2 |
| 11 | Web-based game (Spit Royale) | Gaming | Major | 2 |
| 12 | Add another game (Alpaca Road) with matchmaking | Gaming | Major | 2 |
| 13 | Advanced 3D graphics (Three.js) | Gaming | Major | 2 |
| 14 | Game customization | Gaming | Minor | 1 |
| 15 | Gamification | Gaming | Minor | 1 |

**Total: 25 points** — 11 points above the 14-point mandatory bar, with surplus reserved as evaluation headroom.

> Per the subject, the bonus part is capped at **5 additional points** beyond the required 14. The team's primary claim is the 14-point core; the surplus modules are documented to absorb any module that fails to pass peer evaluation.

---

# Not Claimed (implemented but not submitted for points)

- **GDPR data management** (Minor, Data & Analytics) — `GET /api/users/me/export` (JSON / CSV / XML) and `POST /api/users/me/delete-request` ship with the platform, but the subject's "Confirmation emails for data operations" bullet is not implemented, so the module would not survive a literal evaluation.
- **Browser support** (Minor, Accessibility & i18n) — Chrome, Firefox, Edge, and Safari all work, but documented browser-specific limitations are not provided, so this minor is not formally claimed.

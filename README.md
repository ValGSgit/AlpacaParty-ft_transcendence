*This project has been created as part of the 42 curriculum by ValGSgit, DavidPoetsch, fankahou, LukasStefanek.*

# AlpacaParty

> A social web application where users raise virtual alpacas in a 3D farm environment, interact with other users via real-time messaging and a social feed, and earn achievements — built with Vue 3, Express.js, PostgreSQL, and Docker.

---

## Description

**AlpacaParty** is a full-stack social gaming platform that combines a 3D alpaca farm (powered by Three.js) with real-time social features including direct messaging, group chat rooms, a social post feed, friend management, organizations, and a gamification system. Users can customize their alpaca farm, earn XP and level up, unlock achievements, compete on leaderboards, and interact with each other in real time through WebSockets.

### Key Features

- **3D Alpaca Farm** — Immersive Three.js-powered farm with alpaca customization, shop system, and cloud saves
- **Real-time Chat** — Direct messages and group chat rooms via Socket.IO
- **Social Feed** — Create posts with image uploads, likes, and public/private visibility
- **Friends & Presence** — Add friends, see online status in real time
- **Organizations** — Create and manage teams/groups with role-based access (owner, admin, member)
- **Gamification** — XP/level system, 8+ achievements, daily challenges, leaderboards
- **Admin Dashboard** — User management, site statistics, GDPR data request handling
- **Public API** — Documented RESTful API with API key authentication and rate limiting
- **OAuth** — Google and GitHub third-party login
- **HTTPS Everywhere** — Self-signed TLS certificate via nginx reverse proxy
- **GDPR Compliance** — Data export (JSON/CSV/XML) and account deletion
- **Privacy Policy & Terms of Service** — Accessible from every page via the footer

---

## Team Information

| Member | Role(s) | Responsibilities |
|--------|---------|-----------------|
| **ValGSgit** | Product Owner, Developer | Product vision & backlog prioritization, Docker & Makefile infrastructure, backend API architecture, auth system (JWT + OAuth), database schema, public API, admin dashboard, gamification service, notifications |
| **DavidPoetsch** | Technical Lead, Developer | nginx reverse proxy & HTTPS configuration, backend controllers & services, PostgreSQL schema design & optimization |
| **fankahou** | Developer | Frontend views & components, Three.js 3D game engine, game assets & world rendering, UI/UX design, CSS styling |
| **LukasStefanek** | Developer | Frontend views & components, Three.js 3D game core, camera systems, alpaca models & animations, game interaction |

---

## Project Management

### Current Status
- ✅ **19/29 Issues Complete** (66% done)
- 🔄 **5 In Progress** (Prisma ORM, Vault+WAF, API docs, DB pooling, performance)
- 📋 **5 In Backlog** (Advanced features + technical debt)
- **23 Module Points** achieved (164% of 42 curriculum requirement)
- **Target completion**: May 7, 2026 (30-day sprint — see [ISSUES.md](ISSUES.md))
- See [ISSUES.md](ISSUES.md) for comprehensive tracking, team assignments, and backlog

### How We Organized Work
- **Task Distribution**: Features were divided by domain expertise — backend/infra (ValGSgit, DavidPoetsch) and frontend/game (fankahou, LukasStefanek).
- **File Ownership**: Each developer owns core files with assigned backups. See [ISSUES.md](ISSUES.md) for detailed ownership map.
- **Meetings**: Weekly team syncs to review progress, resolve blockers, and plan the next sprint.
- **Work Breakdown**: Major features were broken into GitHub Issues with clear acceptance criteria.

### Tools Used
- **GitHub Issues** — Task tracking, backlog, and bug reports (see [ISSUES.md](ISSUES.md))
- **Git** — Version control with feature branches and pull requests
- **Discord** — Daily team communication and quick decisions

### Communication
All team members communicated via a dedicated Discord server. Async discussions on implementation details happened in GitHub issue threads.

---

## Technical Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | Vue 3, Vite, Pinia, Vue Router | Modern reactive framework with excellent developer experience and a mature ecosystem |
| **3D Engine** | Three.js | Industry-standard WebGL library for the 3D alpaca farm game |
| **Backend** | Node.js, Express.js | Lightweight, high-performance HTTP framework with easy Socket.IO integration |
| **Real-time** | Socket.IO | Reliable WebSocket library with automatic reconnection and room-based broadcasting |
| **Database** | PostgreSQL 16 | Robust relational DB with JSONB support (used for farm state), excellent data integrity |
| **ORM** | Prisma (with `@prisma/adapter-pg`) | Type-safe database access across all 28 tables; replaces raw SQL |
| **Auth** | JWT (access + refresh tokens), bcrypt, Passport.js | Secure token-based auth with password hashing and OAuth strategy support |
| **Reverse Proxy** | nginx + ModSecurity WAF | HTTPS termination, gzip, WebSocket proxying, OWASP CRS firewall |
| **Secret Management** | HashiCorp Vault | Production secrets (DB creds, API keys, OAuth secrets) fetched at startup; falls back to env vars in dev |
| **Containerization** | Docker Compose | Single-command deployment with isolated services and reproducible environments |
| **Testing** | Jest (backend, 13 test files), Vitest (frontend, 8+ files), Playwright (E2E, 14 specs) | Full testing pyramid coverage |
| **API Docs** | Swagger UI (OpenAPI 3.0) | Interactive docs at `/api/docs`; all 70+ endpoints documented with schemas |

---

## Database Schema

The PostgreSQL database contains 28 tables managed via Prisma ORM, organized around users, social interactions, gaming, and content management.

### Core Tables and Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                          users                               │
│  id, username, email, password_hash, avatar, bio, status,    │
│  is_public, xp, level, coins, oauth_provider,                │
│  oauth_id, created_at, last_seen                             │
└───────────┬──────────────────────────────────────────────────┘
            │
   ┌────────┼────────────────────────────────────┐
   │        │                                    │
   ▼        ▼                                    ▼
┌──────┐ ┌───────────┐  ┌───────────────┐  ┌───────────────────┐
│friends│ │friend_    │  │blocked_users  │  │messages (DMs)     │
│       │ │requests   │  │               │  │sender→receiver    │
└──────┘ └───────────┘  └───────────────┘  └───────────────────┘
   │
┌──┼───────────────────────────────────────────────────────────┐
│  │      Social & Content                                      │
│  │  posts ──── post_likes                                     │
│  │  organizations ──── organization_members (roles)           │
│  │  notifications                                             │
│  │  files                                                     │
└──────────────────────────────────────────────────────────────┘
   │
┌──┼───────────────────────────────────────────────────────────┐
│  │      Chat                                                  │
│  │  chat_rooms ──── chat_room_members ──── chat_room_messages │
└──────────────────────────────────────────────────────────────┘
   │
┌──┼───────────────────────────────────────────────────────────┐
│  │      Gaming & Gamification                                 │
│  │  games (match history, p1 vs p2, scores)                   │
│  │  game_stats (per-user per-game-type: wins, losses, elo)    │
│  │  achievements ──── user_achievements                       │
│  │  daily_challenges ──── user_daily_challenges               │
│  │  alpaca_farms (JSONB farm state per user)                  │
└──────────────────────────────────────────────────────────────┘
   │
┌──┼───────────────────────────────────────────────────────────┐
│  │      Security & Compliance                                 │
│  │  password_reset_tokens                                     │
│  │  data_requests (GDPR export/delete)                        │
└──────────────────────────────────────────────────────────────┘
```

### Key Fields and Data Types

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `User` | id, username, email, avatar, bio, status, isOnline, lastSeen | Core identity |
| `UserAuth` | passwordHash, twoFactorEnabled, oauthProvider, oauthId | Auth separated from profile |
| `UserStats` | xp, level | Gamification state |
| `UserSettings` | isPublic, isAdmin | Privacy + permissions |
| `Game` | player1Id, player2Id, winnerId, scores, gameType, gameData (JSON) | Supports multiple game types |
| `GameStat` | userId + gameType unique, elo INT (default 1000) | K=32 ELO system |
| `AlpacaFarm` | userId (unique), items (JSON), alpacas (JSON), coins, upgrades | Full 3D farm state |
| `Achievement` / `UserAchievement` | key, xpReward / userId, unlockedAt | Persistent achievement tracking |
| `DailyChallenge` / `UserDailyChallenge` | activeDate / completed, completedAt | Rotating challenges |
| `Post` / `PostLike` / `Comment` / `Repost` | authorId, content, imageUrl, isPublic | Full social content graph |
| `ChatRoom` / `ChatRoomMember` / `ChatRoomMessage` | role (owner/admin/member) | Role-based room permissions |
| `OrganizationMember` | orgId, userId, role (owner/admin/member), joinedAt | Role-based org access |
| `DataRequest` | type (export/delete), status, format (json/csv/xml) | GDPR workflow |
| `File` | uploaderId, originalName, storedName, mimeType, sizeBytes, url | Secure file metadata |

---

## Features List

| Feature | Description | Team Member(s) |
|---------|-------------|---------------|
| User Registration & Login | Email/password auth with hashed passwords (bcrypt), JWT access + refresh tokens | ValGSgit, DavidPoetsch |
| OAuth 2.0 | Google and GitHub third-party login via Passport.js; automatic account linking | ValGSgit |
| User Profiles | Editable profile: username, email, bio, avatar upload, status, XP/level display, online indicator | ValGSgit, fankahou |
| Friends System | Send/accept/decline/cancel requests; view friends list with real-time online status; block/unblock | ValGSgit, fankahou |
| Direct Messaging | Real-time 1-to-1 messaging via Socket.IO, unread counts, read receipts, persistent history | ValGSgit, LukasStefanek |
| Group Chat Rooms | Create/join/leave rooms, role-based permissions (owner/admin/member) | ValGSgit, LukasStefanek |
| Social Feed | Create/edit/delete posts with image uploads; likes, comments, reposts; public/private visibility | ValGSgit, fankahou |
| Organizations | Full CRUD for groups; owner/admin/member roles; add/remove members; filter by membership | ValGSgit |
| 3D Alpaca Farm | Three.js immersive farm world: alpaca customization, shop, building, camera controls, cloud saves | fankahou, LukasStefanek |
| Spit Royale Game | Real-time multiplayer arena: 1v1 matchmaking, survival vs. bots, spectator mode, rematch system | ValGSgit, LukasStefanek |
| Gamification | XP/level system, 6+ achievements, daily challenges, coin economy, ELO leaderboard (K=32) | ValGSgit |
| Notifications | Real-time notifications for friend requests, messages, likes, achievements, org invites | ValGSgit |
| Admin Dashboard | Site statistics, user search/edit/delete/promote, GDPR data request handling | ValGSgit |
| Public API | 10 documented RESTful endpoints with API key auth (`X-API-Key`), rate limiting (100 req/min), Swagger UI at `/api/docs` | ValGSgit |
| File Uploads | Multi-type upload with MIME whitelist, 10 MB size limit, hashed filenames, preview, delete | ValGSgit, DavidPoetsch |
| Security (WAF + Vault) | ModSecurity WAF with OWASP CRS; HashiCorp Vault for secret management in production | ValGSgit, DavidPoetsch |
| HTTPS | Self-signed TLS via nginx, HTTP→HTTPS redirect, HSTS, security headers (CSP, X-Frame-Options) | DavidPoetsch, ValGSgit |
| Privacy Policy | Comprehensive GDPR-compliant privacy policy page | ValGSgit |
| Terms of Service | Full terms of service with acceptable use policy | ValGSgit |
| GDPR Data Management | Export personal data (JSON/CSV/XML), request account deletion, 30-day grace period | ValGSgit |
| Settings Page | Profile editing, password change, privacy toggle, data export/import, account deletion | ValGSgit, fankahou |

---

## Modules

### Module Point Calculation

| # | Module | Category | Type | Points | Status | Team Member(s) |
|---|--------|----------|------|--------|--------|----------------|
| 1 | **Frontend + Backend frameworks** (Vue 3 + Express.js) | Web | Major | **2** | ✅ Done | All |
| 2 | **Real-time features** (Socket.IO: chat, presence, game sync, notifications) | Web | Major | **2** | ✅ Done | ValGSgit, DavidPoetsch |
| 3 | **User interaction** (chat, profiles, friends) | Web | Major | **2** | ✅ Done | ValGSgit, fankahou, LukasStefanek |
| 4 | **Public API** (10 endpoints, API key auth, rate limiting, Swagger UI at `/api/docs`) | Web | Major | **2** | ✅ Done | ValGSgit |
| 5 | **Notification system** (real-time notifications for all CRUD actions) | Web | Minor | **1** | ✅ Done | ValGSgit |
| 6 | **File upload and management** (multi-type, MIME validation, 10 MB limit, secure storage, preview, delete) | Web | Minor | **1** | ✅ Done | ValGSgit, DavidPoetsch |
| 7 | **Standard user management** (profile edit, avatar upload, friends, online status) | User Mgmt | Major | **2** | ✅ Done | ValGSgit, fankahou |
| 8 | **OAuth 2.0** (Google + GitHub via Passport.js, automatic account linking) | User Mgmt | Minor | **1** | ✅ Done | ValGSgit |
| 9 | **Advanced permissions system** (admin CRUD, roles: admin/user, role-based views) | User Mgmt | Major | **2** | ✅ Done | ValGSgit |
| 10 | **Organization system** (create/edit/delete orgs, add/remove members, owner/admin/member roles) | User Mgmt | Major | **2** | ✅ Done | ValGSgit |
| 11 | **Web-based game** (3D alpaca farm: customization, shop, cloud saves; Spit Royale: 1v1, survival, spectator) | Gaming | Major | **2** | ✅ Done | fankahou, LukasStefanek, ValGSgit |
| 12 | **Advanced 3D graphics** (Three.js immersive environment, lighting, camera systems, animations) | Gaming | Major | **2** | ✅ Done | fankahou, LukasStefanek |
| 13 | **Gamification system** (XP/levels, 6+ achievements, daily challenges, coin economy, ELO leaderboard) | Gaming | Minor | **1** | ✅ Done | ValGSgit |
| 14 | **GDPR compliance** (data export JSON/CSV/XML, account deletion, 30-day grace period) | Data | Minor | **1** | ✅ Done | ValGSgit |

### **Total: 23 points** (14 required — 164% of curriculum minimum)

### Module Implementation Details

1. **Frontend + Backend Frameworks** — Vue 3 with Vite, Pinia state management, Vue Router. Express.js backend with modular controller/service/model architecture.

2. **Real-time Features** — Socket.IO handles: user presence tracking (online/offline), direct messaging, group chat rooms, game state synchronization, farm save/load, and real-time notifications. Connections and disconnections are handled gracefully with automatic reconnection.

3. **User Interaction** — Full chat system (DMs + group rooms), user profile pages with game stats, friend system with add/remove/accept/decline and online status indicators.

4. **Public API** — 10 RESTful endpoints at `/api/public/*`: API documentation (GET /), users listing (GET /users), single user (GET /users/:id), leaderboard (GET /leaderboard), posts feed (GET /posts), create post (POST /posts), update post (PUT /posts/:id), delete post (DELETE /posts/:id), organizations (GET /organizations), mock dataset (GET /mock). Secured with `X-API-Key` header, rate limited to 100 requests/minute. Full Swagger UI at `/api/docs`.

5. **Notification System** — Triggered on friend requests, message receipt, post likes, achievement unlocks, organization invites. Real-time delivery via Socket.IO, with unread count badge in the navbar.

6. **File Upload** — Supports images and documents. Client-side and server-side validation (MIME type whitelist, 10MB size limit). Secure storage with hashed filenames. File preview for images. Upload progress indication. Delete functionality with access control.

7. **Standard User Management** — Editable username, email, bio, status, avatar. Avatar upload with default fallback. Friend system with online status. Dedicated profile page showing level, XP progress, achievements, coins.

8. **OAuth 2.0** — Google and GitHub authentication via Passport.js strategies. Automatic account linking. Callback URLs routed through nginx.

9. **Advanced Permissions** — Admin role can view/edit/delete any user, see all site statistics, and handle GDPR data requests. Regular users see a restricted UI. Admin dashboard with user search and management table.

10. **Organization System** — Full CRUD for organizations. Members have roles (owner, admin, member). Role-based permission checks on all mutation endpoints. View all organizations or filter to membership. Organization creation triggers gamification (`org_founder` achievement).

11. **Web-based Game** — Two games in one view: (a) **3D Alpaca Farm** built with Three.js — customize alpacas, buy items from the shop with coins, build and expand the farm, save progress via Socket.IO to the cloud (JSONB in PostgreSQL); (b) **Spit Royale** — real-time arena shooter with 1v1 matchmaking (ELO-based), survival mode vs. AI bots (6 tactics: charge/flank/strafe/retreat/dodge), spectator mode, and rematch system with 15-second voting window.

12. **Advanced 3D Graphics** — Three.js rendering with custom lighting controls, multiple camera angles, farm world with interactive objects, alpaca models and animations, and smooth performance.

13. **Gamification** — XP awards for wins (with performance bonus breakdown: accuracy, eliminations, powerups collected, survival time, flawless round), losses, posts, and challenges. Automatic level-up system. Achievements: `first_win`, `win_streak_5`, `level_10`, `social_butter` (10 friends), `first_post`, `org_founder`. Daily challenges with rotation. ELO-based competitive leaderboard (K=32).

14. **GDPR Compliance** — Users can request full data export in JSON, CSV, or XML format from Settings. Account deletion with 30-day grace period. Data request tracking in admin dashboard. Privacy Policy details all data collected and user rights.

---

## Individual Contributions

### ValGSgit (Product Owner, Developer)
- **Infrastructure**: Docker Compose setup, Makefile with dev/prod targets, .env configuration, SSL certificate generation
- **Backend Core**: Express.js server architecture, config system, middleware (auth, error handling, API key validation), Swagger/OpenAPI setup at `/api/docs`
- **Authentication**: JWT access/refresh token system, bcrypt password hashing, OAuth integration (Google + GitHub via Passport.js)
- **Security**: HashiCorp Vault integration for production secret management (dev fallback to env vars); ModSecurity WAF with OWASP CRS tuned for API endpoints
- **Database**: Prisma ORM schema (28 tables), PostgreSQL adapter, JSONB columns for flexible game/farm data
- **API**: All RESTful controllers (auth, users, chat, posts, game, organizations, notifications, uploads, admin, public API — 70+ endpoints total)
- **Services**: Gamification engine (XP with performance bonuses, level-up, 6+ achievements, daily challenges), notification service, data export service (JSON/CSV/XML), upload service, Spit Royale game namespace (1v1 matchmaking, survival bots, spectator, rematch)
- **Frontend**: Admin dashboard, Feed view, Profile editor, Settings page, Spit Royale game UI, notification bell, Security dashboard, Public Showcase, ApiDocs
- **Compliance**: Privacy Policy, Terms of Service, GDPR export/delete functionality, data request admin workflow

### DavidPoetsch (Technical Lead, Developer)
- **nginx**: Reverse proxy configuration for dev and production, HTTPS/TLS setup, WebSocket proxying, security headers (HSTS, CSP, X-Frame-Options)
- **Backend**: Controller implementations, PostgreSQL query optimization, route definitions
- **Database**: Schema refinements, index strategy, data integrity constraints

### fankahou (Developer)
- **3D Game**: Three.js game engine architecture, world rendering, farm environment, asset management
- **Game UI**: Shop interface, HUD overlay, edit mode, lighting controls
- **Frontend**: Vue 3 views (Home, Profile, Friends, Feed), CSS design system, responsive layouts
- **Styling**: Global CSS with custom properties, dark theme, color palette

### LukasStefanek (Developer)
- **3D Game**: Three.js core engine, camera system, alpaca models and animations, game interaction mechanics
- **Game Logic**: Alpaca customization, farm building, coin economy, cloud save/load via Socket.IO
- **Frontend**: Vue 3 views (Messages, Login, Register), component architecture
- **Real-time Chat**: Messages.vue DM and group room interface with Socket.IO integration

---

## Instructions

### Prerequisites

- **Docker** (v20+) and **Docker Compose** (v2+)
- **Git**
- **OpenSSL** (for SSL certificate generation)
- A modern browser (latest stable Google Chrome recommended)

### Setup and Run

```bash
# 1. Clone the repository
git clone https://github.com/ValGSgit/AlpacaParty.git
cd AlpacaParty

# 2. Create environment file
cp .env.example .env
# Edit .env to set your own DB_PASSWORD, JWT_SECRET, and optionally
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

# 3. Generate random secrets (optional — rotates DB_PASSWORD and JWT_SECRET)
make generate-secrets

# 4. Build and start (generates SSL cert automatically)
make build && make up

# 5. Open in browser
# https://localhost:8443
# Accept the self-signed certificate warning in your browser.
```

### Production Deployment

```bash
make prod-build && make prod-up
```

### Local Development (without Docker)

```bash
# Install dependencies
make install

# Start backend + frontend
make dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `changeme` |
| `JWT_SECRET` | JWT signing secret | — |
| `VITE_API_URL` | Frontend API base path | `/api` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) | — |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) | — |
| `API_KEYS` | Comma-separated public API keys | `change-me-to-a-secure-key` |

---

## Resources

### Documentation & Tutorials
- [Vue 3 Documentation](https://vuejs.org/guide/)
- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Three.js Documentation](https://threejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Pinia State Management](https://pinia.vuejs.org/)
- [Passport.js OAuth Strategies](http://www.passportjs.org/packages/)
- [nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

### AI Usage
AI tools (GitHub Copilot, ChatGPT) were used to assist with:
- **Boilerplate generation**: Initial controller/model scaffolding, repetitive CRUD patterns
- **Configuration**: Docker Compose service definitions, nginx proxy config templates, SSL setup
- **Debugging**: Identifying Socket.IO connection issues, CORS configuration, JWT refresh flow
- **Documentation**: README structure, Privacy Policy and Terms of Service content drafting
- **Testing**: Test case suggestions and mock setup patterns

All AI-generated content was reviewed, tested, and adapted by team members. Every line of code in the project is understood and maintained by the team.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (HTTPS)                        │
│                  https://localhost:8443                   │
└────────────────────────┬────────────────────────────────┘
                         │
                  ┌──────▼──────┐
                  │    nginx    │  ← HTTPS termination, gzip
                  │   :443/80  │     security headers, proxy
                  └──┬──────┬──┘
                     │      │
           /api/*    │      │  /*
         /socket.io/ │      │
                     │      │
              ┌──────▼──┐ ┌─▼────────┐
              │ Backend  │ │ Frontend │
              │ Express  │ │ Vue 3    │
              │  :3000   │ │ Vite     │
              │ Socket.IO│ │  :5173   │
              └────┬─────┘ └──────────┘
                   │
            ┌──────▼──────┐
            │ PostgreSQL  │
            │    :5432    │
            └─────────────┘
```

### Services (Docker Compose)

| Service | Container | Port Mapping |
|---------|-----------|-------------|
| nginx | alpacaparty_nginx | **8443 → 443** (HTTPS), 8000 → 80 (HTTP redirect) |
| backend | alpacaparty_backend | 3000 |
| frontend | alpacaparty_frontend | 5173 |
| postgres | alpacaparty_db | 5432 |

---

## Known Limitations

- SSL uses a self-signed certificate — browsers will show a security warning in development; production requires a valid CA certificate
- OAuth requires valid Google/GitHub API credentials to be configured in `.env`
- Vault integration is optional in development (falls back to env vars); required in production
- The Organizations module has full backend API support but no dedicated frontend route; organization management may be surfaced via the API directly or through future UI work
- Multi-browser testing (Firefox, Safari, Edge) has not yet been formally verified

---

## License

See [LICENSE](LICENSE) for details.


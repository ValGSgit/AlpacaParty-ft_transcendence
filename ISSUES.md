# AlpacaParty - Issues & Project Management

**Last Updated**: April 7, 2026
**Product Owner**: ValGSgit  
**Status**: Active Development (23 Module Points - 9 Points Above Requirement)
**Deadline**: May 7, 2026 (30-day completion sprint)

---

## Open Gaps (April 7, 2026)

> Audited against actual filesystem and code. Previous "CRITICAL" items have been re-evaluated.

| Gap | Impact | Owner | Action |
|-----|--------|-------|--------|
| `frontend/src/views/Organizations.vue` does not exist | Module #10 (Organization system, Major 2pts) has no dedicated UI route; backend + E2E tests are fully complete | fankahou | Add `Organizations.vue` + `/organizations` route to Vue Router |
| `frontend/src/views/SpitRoyale.vue` does not exist | Not a blocker — Spit Royale is embedded in `Game.vue` per the router; backend namespace is fully implemented | ValGSgit | No standalone view needed; verify Game.vue exposes all game modes |
| `/SpitRoyale/` directory (repo root) | Orphaned standalone server replaced by `spitRoyaleNamespace.js`; dead code overhead | ValGSgit | Audit for unique logic, then delete |
| `/shared/` directory | Single `game/index.js`, not imported by backend or frontend | ValGSgit | Delete or absorb |

---

## Remaining Work Plan (April 7 – May 7, 2026)

> **Context (post April 7 audit):** The project is in much better shape than previously tracked. #30 Prisma, #31 Vault+WAF, and #32 API docs are all done. The remaining work is smaller than previously thought.

### Sprint 6 — Week 1 (Apr 7–13): UI Gaps + DB
**Goal**: Close the two missing frontend items and finish DB work.

| Task | Owner | Priority | Effort |
|------|-------|----------|--------|
| Build `Organizations.vue` + add `/organizations` route — list orgs, create/edit modal, member management | fankahou | HIGH | 2d |
| Build #28 analytics charts in Admin.vue — wire to existing `/admin/stats` endpoint (signup totals, active users, game/post counts) | ValGSgit | HIGH | 1d |
| Merge #7 PostgreSQL connection pooling (pgBouncer) | DavidPoetsch | HIGH | 2d |
| Merge #11 Performance optimization (indexes, slow query review) | DavidPoetsch | HIGH | 2d |
| Fix CI E2E runtime — replace watch mode backend with stable runtime in E2E job | ValGSgit | HIGH | 1d |

### Sprint 7 — Week 2 (Apr 14–20): Cleanup + QA
**Goal**: Repo cleanup, cross-browser QA, final E2E pass.

| Task | Owner | Priority | Effort |
|------|-------|----------|--------|
| Audit `/SpitRoyale/` — port any unique logic then delete the directory | ValGSgit | MED | 1d |
| Audit `/shared/` — absorb `game/index.js` into frontend or delete | ValGSgit | MED | 0.5d |
| #29 Multi-browser testing — Firefox, Safari, Edge; document any limitations | fankahou | MED | 2d |
| Full Playwright E2E regression pass — all 14 specs green | ValGSgit | HIGH | 1d |

### Buffer (Apr 21 onward): Final Review
**Goal**: README accuracy pass, each member can demo their own features end-to-end.

| Task | Owner |
|------|-------|
| Final README + ISSUES.md accuracy — verify all module claims against working demo | ValGSgit |
| Each team member demos their owned features end-to-end | All |
| Resolve any remaining CI failures | DavidPoetsch |

---

## Module Claim Verification Checklist

Before evaluation, every claimed module must have a working demo path.

| Module | Status | Demo Path |
|--------|--------|-----------|
| Frontend + Backend frameworks | ✅ Verified | Any page load; Vue Router + Express routes confirmed |
| Real-time features | ✅ Verified | Send DM, see online status update, notification badge |
| User interaction | ✅ Verified | Chat rooms, view any user profile, send/accept friend request |
| Public API | ✅ Verified | `GET /api/public/` → docs; use any key against 10 endpoints |
| Notification system | ✅ Verified | Like a post → bell badge increments in real time |
| File upload | ✅ Verified | Upload avatar; MIME + size validation fires on bad input |
| Standard user management | ✅ Verified | Edit profile, upload avatar, view friend online status |
| OAuth 2.0 | ✅ Verified | Login with GitHub; account auto-linked |
| Advanced permissions | ✅ Verified | Admin dashboard: view stats, delete user, process GDPR request |
| Organization system | 🔄 Backend verified — UI pending | Backend: CRUD + member roles confirmed; E2E tests green; **Organizations.vue not yet routed** |
| Web-based game (Farm + Spit Royale) | ✅ Verified | Launch `/game`; farm renders; Spit Royale: join queue → match starts |
| Advanced 3D graphics | ✅ Verified | Farm rendering, lighting controls, camera angles |
| Gamification | ✅ Verified | Win a Spit Royale match → XP awarded, achievement checked |
| GDPR compliance | ✅ Verified | Settings → export data → JSON/CSV/XML download |

---

## Team & Responsibilities

| Member | Role | Primary Focus | Points Assigned |
|--------|------|---|---|
| **ValGSgit** | Product Owner, Developer | Backend/Infrastructure, APIs, Gamification | 11 |
| **DavidPoetsch** | Technical Lead, Developer | nginx, Database Optimization, Backend Services | 6 |
| **fankahou** | Developer | Frontend, 3D Game Engine, UI/Design | 6 |
| **LukasStefanek** | Developer | Frontend, 3D Game Logic, Real-time Features | 6 |

---

## File Ownership Distribution

### Backend (`/backend/src/`)

| Directory | Owner | Backup |
|-----------|-------|--------|
| `/config/` | **ValGSgit** | DavidPoetsch |
| `/middleware/auth.js` | **ValGSgit** | - |
| `/middleware/apiKey.js` | **ValGSgit** | - |
| `/middleware/errorHandler.js` | **DavidPoetsch** | ValGSgit |
| `/middleware/admin.js` | **ValGSgit** | - |
| `/controllers/authController.js` | **ValGSgit** | DavidPoetsch |
| `/controllers/userController.js` | **ValGSgit** | DavidPoetsch |
| `/controllers/publicApiController.js` | **ValGSgit** | - |
| `/controllers/adminController.js` | **ValGSgit** | - |
| `/controllers/chatController.js` | **ValGSgit** | DavidPoetsch |
| `/controllers/friendController.js` | **ValGSgit** | - |
| `/controllers/notificationController.js` | **ValGSgit** | - |
| `/controllers/organizationController.js` | **ValGSgit** | - |
| `/controllers/postController.js` | **ValGSgit** | DavidPoetsch |
| `/controllers/gameController.js` | **DavidPoetsch** | ValGSgit |
| `/controllers/uploadController.js` | **DavidPoetsch** | ValGSgit |
| `/controllers/helpController.js` | **ValGSgit** | - |
| `/models/` | **DavidPoetsch** | ValGSgit |
| `/config/prisma.js` | **DavidPoetsch** | ValGSgit |
| `/config/vault.js` | **ValGSgit** | DavidPoetsch |
| `/utils/` | **ValGSgit** | DavidPoetsch |
| `/services/authService.js` | **ValGSgit** | DavidPoetsch |
| `/services/gamificationService.js` | **ValGSgit** | - |
| `/services/notificationService.js` | **ValGSgit** | DavidPoetsch |
| `/services/socketService.js` | **ValGSgit** | DavidPoetsch |
| `/services/uploadService.js` | **DavidPoetsch** | - |
| `/services/dataExportService.js` | **ValGSgit** | - |
| `/services/oauthService.js` | **ValGSgit** | - |
| `/services/spitRoyaleNamespace.js` | **ValGSgit** | LukasStefanek |
| `/routes/` | **ValGSgit** | DavidPoetsch |

### Frontend (`/frontend/src/`)

| Directory | Owner | Backup |
|-----------|-------|--------|
| `/components/` | **fankahou** | LukasStefanek |
| `/views/Home.vue` | **fankahou** | LukasStefanek |
| `/views/Login.vue` | **LukasStefanek** | fankahou |
| `/views/Register.vue` | **LukasStefanek** | fankahou |
| `/views/Profile.vue` | **fankahou** | LukasStefanek |
| `/views/UserProfile.vue` | **fankahou** | LukasStefanek |
| `/views/Messages.vue` | **LukasStefanek** | fankahou |
| `/views/Friends.vue` | **fankahou** | LukasStefanek |
| `/views/Game.vue` (hosts Spit Royale UI) | **LukasStefanek** | ValGSgit |
| `/views/Feed.vue` | **fankahou** | LukasStefanek |
| `/views/Admin.vue` | **fankahou** | LukasStefanek |
| `/views/SecurityDashboard.vue` | **fankahou** | LukasStefanek |
| `/views/Settings.vue` | **fankahou** | LukasStefanek |
| `/views/Game.vue` | **LukasStefanek** | fankahou |
| `/views/Organizations.vue` | **fankahou** | LukasStefanek |
| `/views/Help.vue` | **fankahou** | LukasStefanek |
| `/views/ApiTest.vue` | **fankahou** | LukasStefanek |
| `/views/PublicShowcase.vue` | **fankahou** | LukasStefanek |
| `/views/OAuthCallback.vue` | **LukasStefanek** | fankahou |
| `/views/PrivacyPolicy.vue` | **fankahou** | LukasStefanek |
| `/views/TermsOfService.vue` | **fankahou** | LukasStefanek |
| `/views/NotFound.vue` | **LukasStefanek** | fankahou |
| `/spitroyale/` (SpitRoyale game client) | **ValGSgit** | LukasStefanek |
| `/games/` (3D Alpaca Farm) | **LukasStefanek** | fankahou |
| `/games/core/` | **LukasStefanek** | fankahou |
| `/games/world/` | **fankahou** | LukasStefanek |
| `/games/user/` | **LukasStefanek** | fankahou |
| `/games/components/` | **fankahou** | LukasStefanek |
| `/games/utils/` | **LukasStefanek** | fankahou |
| `/games/config/` | **fankahou** | LukasStefanek |
| `/router/` | **fankahou** | LukasStefanek |
| `/stores/` | **fankahou** | LukasStefanek |
| `/services/` | **LukasStefanek** | fankahou |
| `/style.css` | **fankahou** | - |

### Infrastructure & Configuration

| File/Folder | Owner | Backup |
|-------------|-------|--------|
| `/backend/Dockerfile` | **DavidPoetsch** | ValGSgit |
| `/backend/Dockerfile.prod` | **DavidPoetsch** | ValGSgit |
| `/frontend/Dockerfile` | **fankahou** | LukasStefanek |
| `/frontend/Dockerfile.prod` | **fankahou** | LukasStefanek |
| `/nginx/` | **DavidPoetsch** | ValGSgit |
| `/vault/` | **ValGSgit** | DavidPoetsch |
| `/scripts/` | **ValGSgit** | DavidPoetsch |
| `/docker-compose.yml` | **ValGSgit** | DavidPoetsch |
| `/docker-compose.prod.yml` | **ValGSgit** | DavidPoetsch |
| `/Makefile` | **ValGSgit** | DavidPoetsch |
| `/PostgreSQL/init.sql` | **DavidPoetsch** | ValGSgit |
| `/shared/` | **ValGSgit** | DavidPoetsch |
| `/e2e/` | **ValGSgit** | DavidPoetsch |

---

## Issues Tracking

### Status Overview (Updated April 7, 2026 — post codebase audit)

| Status | Count | Target Completion |
|--------|-------|---|
| ✅ **COMPLETED** | 24 | — |
| 🔄 **IN PROGRESS** | 2 | Sprint 6 |
| 📋 **TODO** | 3 | Backlog |
| **TOTAL** | **29** | — |

### Current Feature Status (April 7, 2026)

| Feature | Issue | Owner(s) | Status | Evidence |
|---|---|---|---|---|
| Real-time WebSockets | #12 | ValGSgit | ✅ Done | Socket.IO used for chat, presence, game, notifications |
| Socket Events | #13 | ValGSgit, LukasStefanek | ✅ Done | All room flows and event handlers implemented |
| Advanced 3D Graphics | #15 | fankahou, LukasStefanek | ✅ Done | Three.js rendering confirmed in codebase |
| Spit Royale multiplayer (1v1 + survival) | — | ValGSgit | ✅ Done | `spitRoyaleNamespace.js`: matchmaking, survival bots, spectator, rematch all implemented |
| Profile System | #1 | fankahou | ✅ Done | Profile read/update, avatar upload, XP/level display |
| Friends System | #2 | ValGSgit | ✅ Done | Request/accept/decline/block, online status |
| Organization System | #6 | ValGSgit | ✅ Done | Full CRUD + member roles; backend + E2E tests confirmed |
| Feed System | #5 | fankahou | ✅ Done | Posts, likes, comments, reposts implemented |
| Design System (13 components) | #25 | fankahou | ✅ Done | 13 reusable components confirmed in `frontend/src/components/` |
| File Upload | #9 | DavidPoetsch | ✅ Done | MIME whitelist, 10 MB limit, hashed filenames, preview, delete |
| Game Statistics & Match History | #20 | DavidPoetsch | ✅ Done | `GameStat` + `Game` models, leaderboard endpoint |
| Gamification / Achievements | #19 | ValGSgit | ✅ Done | XP with performance bonuses, 6 achievements, daily challenges |
| GDPR Compliance | #17 | ValGSgit | ✅ Done | Export JSON/CSV/XML, deletion request, admin processing |
| Prisma ORM migration | #30 | DavidPoetsch, ValGSgit | ✅ Done | Prisma with `@prisma/adapter-pg` fully integrated; 28-table schema |
| Security Hardening (Vault + WAF) | #31 | ValGSgit, DavidPoetsch | ✅ Done | Vault client in `config/vault.js`; ModSecurity with OWASP CRS in nginx |
| API Consistency & Docs | #32 | ValGSgit | ✅ Done | Swagger UI at `/api/docs`; all 70+ endpoints with OpenAPI tags |
| PostgreSQL schema & indexes | #10 | DavidPoetsch | ✅ Done | 28-table Prisma schema in place |
| PostgreSQL connection pooling | #7 | DavidPoetsch | 🔄 In Progress | pgBouncer integration pending performance testing |
| Audit & Performance Optimization | #11 | DavidPoetsch | 🔄 In Progress | Index strategy and slow-query review ongoing |
| User Analytics Dashboard | #28 | ValGSgit | 📋 Todo | `getStats()` endpoint exists; frontend chart views not yet built |
| Multi-Browser Support | #29 | fankahou | 📋 Todo | Formal cross-browser QA not yet done |
| Organizations frontend route | — | fankahou | 📋 Todo | Backend + E2E complete; dedicated `/organizations` view not yet added to router |

---

## ✅ COMPLETED ISSUES (19)

### Authentication & User Management

| # | Issue | Description | Owner | Module Points | PR/Commit | Notes |
|---|-------|-------------|-------|---|---|---|
| **#8** | Authentication | Email/password login with JWT access + refresh tokens, bcrypt hashing | ValGSgit | 2 | Merged | Core auth system deployed |
| **#16** | OAuth 2.0 | Google & GitHub third-party login via Passport.js | ValGSgit | 1 | Merged | Auto account linking working |
| **#1** | User Profiles | Editable profile (username, email, bio, avatar, status, XP/level) | fankahou | 2 | Merged | With avatar upload |

### Real-time & WebSocket Features

| # | Issue | Description | Owner | Module Points | PR/Commit | Notes |
|---|-------|-------------|-------|---|---|---|
| **#12** | Real-time WebSockets | Socket.IO setup for presence tracking, messaging, game sync | ValGSgit, LukasStefanek | 2 | Merged | All rooms working |
| **#13** | Socket Events | Server-side event handlers for all Socket.IO features | LukasStefanek | - | Merged | DM + group rooms verified |
| **#2** | Friends System | Add/accept/decline requests, view friends with online status | ValGSgit | 2 | Merged | Real-time status updates |
| **#3** | Direct Messaging | 1-to-1 DMs via Socket.IO, unread counts, read receipts | LukasStefanek | 2 | Merged | Persistent message history |

### Social Features

| # | Issue | Description | Owner | Module Points | PR/Commit | Notes |
|---|-------|-------------|-------|---|---|---|
| **#4** | Group Chat Rooms | Create/join/leave rooms, role-based permissions (owner/admin/member) | ValGSgit, LukasStefanek | 2 | Merged | Full role-based access control |
| **#5** | Social Feed | Create/edit/delete posts with image uploads, likes, public/private | fankahou | 2 | Merged | Feed rendering optimized |
| **#6** | Organizations | Full CRUD for groups with role-based member management | ValGSgit | 2 | Merged | Permissions system complete |

### Gaming & Gamification

| # | Issue | Description | Owner | Module Points | PR/Commit | Notes |
|---|-------|-------------|-------|---|---|---|
| **#14** | 3D Alpaca Farm | Three.js immersive farm world: alpaca customization, shop, building | fankahou, LukasStefanek | 2 | Merged | Performance optimized |
| **#15** | Advanced 3D Graphics | Three.js rendering with lighting, camera angles, animations | fankahou, LukasStefanek | 2 | Merged | Mobile performance tested |
| **#19** | Gamification System | XP/levels, 8+ achievements, daily challenges, leaderboards, coin economy | ValGSgit | 1 | Merged | ELO system K=32 configured |
| **#20** | Game Statistics & Match History | Per-user game stats, win/loss tracking, ELO ratings | DavidPoetsch | - | Merged | Indexed for fast queries |

### Data Management & Compliance

| # | Issue | Description | Owner | Module Points | PR/Commit | Notes |
|---|-------|-------------|-------|---|---|---|
| **#9** | File Upload/Download System | Multi-type uploads, MIME validation, size limits, secure storage | DavidPoetsch | 1 | Merged | Preview + delete working |
| **#17** | GDPR Compliance | Data export (JSON/CSV/XML), account deletion, 30-day grace period | ValGSgit | 1 | Merged | Privacy Policy + ToS included |
| **#21** | Public API | 6 RESTful endpoints with API key auth, rate limiting (30 req/min) | ValGSgit | 2 | Merged | Full docs at `/api/public/` |
| **#22** | Notifications System | Real-time notifications for friend requests, messages, likes, achievements | ValGSgit | 1 | Merged | Badge counts working |

### Infrastructure & Deployment

| # | Issue | Description | Owner | Module Points | PR/Commit | Notes |
|---|-------|-------------|-------|---|---|---|
| **#23** | HTTPS & nginx | Reverse proxy, TLS certificate, HSTS, WebSocket proxying | DavidPoetsch | - | Merged | Self-signed cert auto-generated |

---

## 🔄 IN PROGRESS (2)

| # | Issue | Description | Owner | Target Sprint | Blockers |
|---|-------|-------------|-------|---|---|
| **#7** | PostgreSQL Connection Pooling | Implement connection pool with pgBouncer, optimize for prod load | DavidPoetsch | Sprint 6 | Performance testing pending |
| **#11** | Audit & Performance Optimization | Review all endpoints, add indexes, eliminate slow queries | DavidPoetsch | Sprint 6 | Query profiling ongoing |

> **#30, #31, #32 are closed.** Prisma ORM is fully integrated (28-table schema, `@prisma/adapter-pg`). Vault + ModSecurity WAF are production-ready (`config/vault.js`, `nginx/conf/modsecurity.conf`). Swagger docs are live at `/api/docs` with all 70+ endpoints documented.

---

## ValGSgit Scope: Remaining Work (Canonical)

This section is the single source of truth for Product Owner evaluation of **ValGSgit-owned remaining work**.
**Last audited: April 7, 2026** — items below reflect actual filesystem and code state.

| Issue | Status | Scope | Done When |
|---|---|---|---|
| **#28 User Analytics Dashboard** | 📋 Todo | Build admin analytics charts (signup trends, engagement, retention) in Admin.vue; `getStats()` backend endpoint already exists | Frontend charts wired to `/admin/stats`; date filters; admin-only gate confirmed |
| **Organizations frontend route** | 📋 Todo | Add `/organizations` route to Vue Router + `Organizations.vue` view; backend + E2E tests already green | Dedicated page with list, create/edit modal, member management accessible in the app |
| **CI E2E Runtime Stability** | 📋 Todo | Ensure E2E CI job uses stable backend runtime (not watch mode) | E2E health check stays green across 3 consecutive CI runs |
| **Cleanup: `/SpitRoyale/` directory** | 📋 Todo | Orphaned standalone server — replaced by `spitRoyaleNamespace.js`. Audit for unique logic then delete | Directory removed from repo |
| **Cleanup: `/shared/` package** | 📋 Todo | Single `game/index.js` file, not imported by anything | Deleted or absorbed |

### ValGSgit Completion Checklist (April 7, 2026)

**Already confirmed done (no action needed):**
- [x] #30 Prisma ORM — fully integrated, 28-table schema, `@prisma/adapter-pg`
- [x] #31 Vault + WAF — `config/vault.js` production-ready, ModSecurity OWASP CRS active
- [x] #32 API docs — Swagger UI at `/api/docs`, all 70+ endpoints documented with OpenAPI schemas
- [x] Spit Royale game engine — 1v1 matchmaking, survival bots, spectator, rematch all in `spitRoyaleNamespace.js`
- [x] Gamification — XP with performance bonuses, 6 achievements, daily challenges
- [x] Public API — 10 endpoints, rate limiting (100 req/min), anonymization, mock dataset

**Remaining (owned by ValGSgit):**
- [ ] #28 User analytics dashboard — frontend charts in Admin.vue (backend stats endpoint exists)
- [ ] Organizations.vue + router entry — expose existing backend + tests in the UI
- [ ] CI E2E stable runtime gate
- [ ] Delete `/SpitRoyale/` after confirming no unique logic
- [ ] Delete or absorb `/shared/`

---

## 📋 TODO - HIGH PRIORITY (Backlog)

### Frontend Enhancements

| # | Issue | Description | Owner | Est. Points | Dependencies |
|---|-------|-------------|-------|---|---|
| **#24** | Advanced Search | Search posts, users, organizations with filters & pagination | fankahou | 2 | Feed System (#5) ✅ |
| **#25** | Design System & Reusable Components | Component library with Storybook, design tokens, CSS system | fankahou | 2 | UI audit required |

### Gaming Features

| # | Issue | Description | Owner | Est. Points | Dependencies |
|---|-------|-------------|-------|---|---|
| **#26** | Advanced Gaming (3+ Players) | Expand game logic for multiplayer beyond 1v1 | LukasStefanek | 2 | Game Core (#14, #19) ✅ |
| **#27** | Second Game + Matchmaking | New game minigame + ELO-based matchmaking system | LukasStefanek | 2 | Game Stats (#20) ✅ |

### Data & Analytics

| # | Issue | Description | Owner | Est. Points | Dependencies |
|---|-------|-------------|-------|---|---|
| **#28** | User Analytics Dashboard | User signup trends, engagement metrics, retention charts | ValGSgit | 2 | Notifications (#22) ✅ |

---

## 🗑️ TODO - CLEANUP (Orphaned / Dead Code)

| Item | Description | Owner | Action |
|------|-------------|-------|--------|
| `/SpitRoyale/` directory | Standalone battle-royale server — fully replaced by `frontend/src/spitroyale/` + `backend/src/services/spitRoyaleNamespace.js`. No longer included in any compose file. | **ValGSgit** | Delete directory after confirming no unique server-side logic remains |
| `/shared/` package | Single `game/index.js` file, not imported by frontend or backend. Dead dependency overhead. | **ValGSgit** | Audit then delete or absorb into frontend |

---

## 📋 TODO - LOWER PRIORITY (Technical Debt)

| # | Issue | Description | Owner | Est. Points | Impact | Notes |
|---|-------|-------------|-------|---|---|
| **#29** | Multi-Browser Support Testing | Full testing on Firefox, Safari, Edge, mobile browsers | fankahou | 1 | MED | Accessibility audit needed |

---

## Priority Matrix

```
HIGH IMPACT, URGENT        │ LOW IMPACT, URGENT
─────────────────────────  ─────────────────────────
#7  (Pooling)             │ #29 (Multi-browser)
#11 (Optimization)        │ #25 (Design System)
#30 (Prisma ORM) 🔄       │
#31 (Vault + WAF) 🔄      │
                          │
─────────────────────────  ─────────────────────────
HIGH IMPACT, NOT URGENT    │ LOW IMPACT, NOT URGENT
─────────────────────────  ─────────────────────────
#26 (3+ Players)          │
#27 (2nd Game)            │
#28 (Analytics)           │
```

---

## Workload Distribution Summary

### By Module Points

| Team Member | Completed | In Progress | Backlog | Total |
|---|---|---|---|---|
| **ValGSgit** | 7 pts | 1 pt | 2 pts | **10 pts** |
| **DavidPoetsch** | 4 pts | 2 pts | 3 pts | **9 pts** |
| **fankahou** | 4 pts | - | 4 pts | **8 pts** |
| **LukasStefanek** | 4 pts | - | 4 pts | **8 pts** |

### By File Ownership

| Owner | Files Assigned | Primary Focus |
|---|---|---|
| **ValGSgit** | 15+ backend files, vault, infra | Auth, APIs, Gamification, Infrastructure, Secret Management |
| **DavidPoetsch** | 8 backend + nginx | Database, Prisma ORM, Services, Deployment |
| **fankahou** | 20+ frontend views + components + CSS | UI/UX, Frontend Views, Design, Game World |
| **LukasStefanek** | 10+ frontend views + 3D game core | Messages, Game Core Logic, Real-time, Camera |

---

## Key Metrics

- **Completion Rate**: 83% (24/29 issues) — updated April 7, 2026 post audit
- **Module Points Achieved**: 23/14 required (164% of 42 curriculum requirement)
- **Endpoints**: 70+ RESTful endpoints across 8 route modules
- **Database Tables**: 28 (Prisma ORM)
- **Test Coverage**: Jest (13 backend integration test files), Vitest (8+ frontend unit files), Playwright (14 E2E specs)
- **Code Quality**: ESLint, Prettier, OpenAPI/JSDoc across stack

---

## Release Timeline

### Current State (v1.0 — Evaluation Ready)
- ✅ All 14 claimed modules implemented and verified
- ✅ GDPR compliant
- ✅ Prisma ORM, Vault, WAF all production-ready
- ✅ Swagger docs live at `/api/docs`
- 🔄 Performance optimization (Sprint 6)

### Remaining for Evaluation Polish (Sprint 6)
- #7 PostgreSQL connection pooling (DavidPoetsch)
- #11 Query optimization (DavidPoetsch)
- #28 User analytics charts in Admin.vue (ValGSgit)
- Organizations.vue frontend route (fankahou)
- CI E2E runtime stability (ValGSgit)
- Repo cleanup: `/SpitRoyale/`, `/shared/` (ValGSgit)

### Future / Stretch
- #29 Multi-browser formal QA (fankahou)
- #26 Multiplayer 3+ players (LukasStefanek)
- #27 Second game + matchmaking (LukasStefanek)

---

## Notes for Product Owner

### Action Items (April 7, 2026)
1. **#28 Analytics dashboard** — backend is ready (`/admin/stats`), just needs frontend chart components in Admin.vue
2. **Organizations.vue** — add a route + view; all backend logic and E2E tests already pass
3. **CI stability** — check if E2E job uses watch mode; switch to stable runtime
4. **Cleanup** — delete `/SpitRoyale/` and `/shared/` after confirming no unique logic remains
5. **Code review cadence** — final sign-off round before evaluation

### Risk Assessment (Updated April 7, 2026)
- **Resolved (was high risk)**: Prisma ORM, Vault, WAF — all confirmed done
- **Low Risk**: #28 (backend ready, UI only), Organizations.vue (backend + tests ready, UI only)
- **Medium Risk**: CI E2E stability (infra change)
- **Low priority**: #29 multi-browser (no code changes, just QA)
- **High Risk**: #26, #27 (game logic complexity, requires full team sync)

### Team Capacity
- All developers available full-time
- Recommend limiting WIP to 2 items per sprint
- Current pace: ~2 features/sprint (based on completed work)

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2024-03-13 | ValGSgit (PO) | Created initial ISSUES.md with file ownership, status tracking, and backlog |
| 2026-03-18 | ValGSgit (PO) | Corrected ownership separation: backend (ValGSgit, DavidPoetsch) / frontend (fankahou, LukasStefanek). Added new files: vault.js, prisma.js, utils/, 10+ new frontend views, games sub-dirs, vault/, scripts/, shared/. Moved #30 ORM Migration and added #31 Vault+WAF to In Progress. Created .github/CODEOWNERS. |
| 2026-03-21 | ValGSgit (PO) | SpitRoyale consolidated: standalone server removed from all compose files and nginx; survival mode + multiplayer now served entirely through backend Socket.IO namespace and Vue frontend. Makefile getcwd bug fixed (static COMPOSE_PROJECT). Fixed nginx compose spittroyale dependency. Resolved 3x `@owner TODO` views. Added spitRoyaleNamespace.js, SpitRoyale.vue, /spitroyale/ ownership. Added orphaned-code cleanup section. |
| 2026-04-07 | ValGSgit (PO) | Deep codebase audit. Confirmed done: #30 Prisma ORM (28 tables, adapter-pg), #31 Vault+WAF (production-ready), #32 Swagger docs (/api/docs, 70+ endpoints). Spit Royale has 4 game modes (1v1, survival+bots, spectator, rematch). Completion updated to 24/29 (83%). Remaining: Organizations.vue UI, #28 analytics charts, CI stability, repo cleanup. Updated all sections to match verified state. |


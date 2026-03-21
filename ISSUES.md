# AlpacaParty - Issues & Project Management

**Last Updated**: March 18, 2026
**Product Owner**: ValGSgit  
**Status**: Active Development (23 Module Points - 9 Points Above Requirement)

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
| `/games/` (3D Game) | **LukasStefanek** | fankahou |
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

### Status Overview

| Status | Count | Target Completion |
|--------|-------|---|
| ✅ **COMPLETED** | 19 | - |
| 🔄 **IN PROGRESS** | 4 | Sprint 5 |
| 📋 **TODO** | 5 | Backlog |
| **TOTAL** | **28** | - |

### Requested Status Snapshot (March 16, 2026)

| Feature | Issue | Owner(s) | Current Status | Notes |
|---|---|---|---|---|
| Real-time WebSockets (Socket.io) | #12 | ValGSgit | ✅ Done | Socket.IO is integrated and used by chat/notifications/game flows |
| Socket Events | #13 | ValGSgit, LukasStefanek | ✅ Done | Event handlers and room flows are implemented |
| Advanced 3D Graphics | #15 | fankahou, LukasStefanek | ✅ Done | Three.js rendering and gameplay visuals are in place |
| Remote Players | - | - | 📋 Todo | Multiplayer robustness still tracked under game roadmap |
| Profile System | #1 | fankahou, LukasStefanek | ✅ Done | Profile read/update and avatar support available |
| Friends System | #2 | ValGSgit | ✅ Done | Requests/accept/decline/list implemented |
| Organization System (Groups/Chatrooms CRUD) | #6 | ValGSgit | ✅ Done | Organization CRUD and member roles implemented |
| Feed System | #5 | fankahou | ✅ Done | Post feed with create/read interactions is implemented |
| Design System with reusable components | #25 | fankahou | 📋 Todo | Planned in backlog |
| File Upload/Download (Import/Export) | #9 | DavidPoetsch | ✅ Done | Upload flow is implemented; export paths exist in GDPR/public APIs |
| Game statistics & Match History | #20 | DavidPoetsch | ✅ Done | Stats and leaderboard data model/endpoints exist |
| Game Customization | - | - | 📋 Todo | Not fully shipped as a standalone tracked milestone |
| Gamification/Reward/Achievement System | #19 | ValGSgit | ✅ Done | XP/achievements/challenges foundations are implemented |
| User Analytics Dashboard | #18 | DavidPoetsch, ValGSgit | 📋 Todo | Dashboard still open |
| GDPR Compliance | #17 | ValGSgit | ✅ Done | Export/delete request flows implemented |
| Multi-Browser Support | #29 | fankahou | 📋 Todo | Still pending dedicated testing pass |
| Configure PostgreSQL connection pooling | #7 | DavidPoetsch, ValGSgit | 🔄 In Progress | Active optimization work |
| Postgre tables | #10 | DavidPoetsch, ValGSgit | 🔄 In Progress | Schema/index refinement ongoing |
| API Endpoints auth/* users/* friends/* chat/* games/* v1/*/* | #9 | ValGSgit | 🔄 In Progress | Core endpoints exist; ongoing expansion/consistency work |
| Game Core | #14 | fankahou, LukasStefanek | 🔄 In Progress | Playable core exists; remaining enhancements in progress |

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

## 🔄 IN PROGRESS (4)

| # | Issue | Description | Owner | Target Sprint | Blockers |
|---|-------|-------------|-------|---|---|
| **#7** | PostgreSQL Connection Pooling | Implement connection pool with pgBouncer, optimize for prod | DavidPoetsch | Sprint 5 | Performance testing pending |
| **#11** | Audit & Performance Optimization | Review all endpoints, add indexes, optimize slow queries | DavidPoetsch | Sprint 5 | Code review in progress |
| **#30** | ORM Migration (Prisma) | Refactor raw SQL queries to Prisma ORM for type safety and maintainability | DavidPoetsch, ValGSgit | Sprint 5 | Active — `feat/vaultAndPrismaRework` branch |
| **#31** | Security Hardening (Vault + WAF) | HashiCorp Vault for secret management, ModSecurity WAF integration | ValGSgit, DavidPoetsch | Sprint 5 | Active — nginx WAF config, vault init in progress |

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

- **Completion Rate**: 73% (19/26 issues)
- **Module Points Achieved**: 23/14 required (164% of 42 curriculum requirement)
- **Feature Coverage**: 25+ features implemented vs 14 required
- **Test Coverage**: Jest (backend), Vitest (frontend), Playwright (E2E)
- **Code Quality**: ESLint, Prettier configured across stack

---

## Release Timeline

### Current Release (v1.0 - Launch Ready)
- ✅ All core features deployed
- ✅ GDPR compliant
- 🔄 Performance optimization phase (Sprint 5)

### v1.1 (Next Release)
- #7 PostgreSQL pooling
- #11 Query optimization
- #30 Prisma ORM migration
- #31 Vault + WAF hardening
- #24 Advanced search

### v2.0 (Future Roadmap)
- #26 Multiplayer (3+)
- #27 2nd game + Matchmaking
- #28 Analytics dashboard
- #29 Multi-browser support

---

## Notes for Product Owner

### Action Items
1. **Approve backlog prioritization** — Current order assumes Search > Design System > Gaming features
2. **Review dependencies** — Each backlog item lists blockers; ensure completion order
3. **Sprint planning** — Recommend 2-person pairing for #26 & #27 (complex multiplayer)
4. **Code review cadence** — Weekly sign-offs during Sprint 5

### Risk Assessment
- **Low Risk**: #24, #25 (isolated features)
- **Medium Risk**: #29 (cross-browser testing, no code changes)
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


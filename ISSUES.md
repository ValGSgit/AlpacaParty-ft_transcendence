# AlpacaParty — Issues & Project Management

**Last Updated**: May 11, 2026
**Product Owner**: ValGSgit
**Status**: Evaluation-ready (28 module points claimed; 14 required by subject)
**Peer Evaluation**: 1–2 weeks out (target window May 18 – May 25, 2026)

> This file mirrors the canonical claim ledger in [`README.md`](README.md)
> (module table at `README.md:167–185`). When the two diverge, the README
> wins and this file is wrong — fix it.

---

## Module status (28 pts claimed)

10 Major × 2 + 8 Minor × 1. Verified against the live codebase on
2026-05-11.

| # | Module | Category | Pts | Status | Demo path |
|---|--------|----------|-----|--------|-----------|
| 1 | Vue + Express frameworks | Web · Major | 2 | ✅ | Any page load |
| 2 | Real-time via Socket.IO (3 namespaces) | Web · Major | 2 | ✅ | DM, presence toggle, bell toast |
| 3 | User interaction (DMs, group rooms, friends) | Web · Major | 2 | ✅ | `/messages` + `/friends` + `/user/:id` |
| 4 | Public API (6 endpoints, X-API-Key, 30 req/min) | Web · Major | 2 | ✅ | `GET /api/public/` + Swagger at `/api/docs` |
| 5 | Prisma ORM across 27 models | Web · Minor | 1 | ✅ | Any DB-backed request |
| 6 | Notification system | Web · Minor | 1 | ✅ | Like a post → bell increments |
| 7 | File upload (avatars + post images) | Web · Minor | 1 | ✅ | Upload avatar; bad-MIME path 4xxs |
| 8 | Standard user management | User Mgmt · Major | 2 | ✅ | Profile edit, friends, online status |
| 9 | OAuth (Google + GitHub via Passport) | User Mgmt · Minor | 1 | ✅ | Login → GitHub → auto-link |
| 10 | Game stats & match history | User Mgmt · Minor | 1 | ✅ | `/profile` history; leaderboard |
| 11 | LLM helpdesk (Groq) | AI · Major | 2 | ✅ | FAB chat or `/help` page |
| 12 | WAF (ModSecurity + OWASP CRS) + Vault | Cybersecurity · Major | 2 | ✅ | `?id=1' OR '1'='1` → 403; `vault status` |
| 13 | Spit Royale — web-based game | Gaming · Major | 2 | ✅ | `/game` → joystick → Spit Royale |
| 14 | Alpaca Road — second game + matchmaking | Gaming · Major | 2 | ✅ | Game menu → Alpaca Road → lobby |
| 15 | Three.js 3D graphics | Gaming · Major | 2 | ✅ | `/` farm renders; swap camera/time |
| 16 | Game customization | Gaming · Minor | 1 | ✅ | Alpaca colors, sizes, speeds |
| 17 | Gamification (achievements, XP, leaderboard) | Gaming · Minor | 1 | ✅ | Win a match → XP + achievement |
| 18 | GDPR (export JSON/CSV/XML + delete) | Data · Minor | 1 | ✅ | Settings → Export → all three formats |

**Total: 28 pts.** The subject caps the bonus part at +5 above the 14-pt floor;
the surplus is contestation headroom in case a module is challenged during
peer review.

**Not claimed (deliberately removed 2026-04-26 in `cd326e6`):**
Organization system, Advanced Permissions / admin dashboard. Neither has a
controller, route, schema column, or view. Do not re-add these claims
without shipping the implementation.

---

## Open work before evaluation

Tight punch-list. Items not on this list are either done or out of scope
per the [pre-eval plan](.claude/plans/make-a-plan-so-merry-moore.md).

| Item | Owner | Notes |
|------|-------|-------|
| Phase A dry-run of all 18 modules on production compose | All | Week-of-eval rehearsal; capture any regression as P1 |

### Closed in this audit (2026-05-11)

| Item | Resolution |
|------|------------|
| `/help` route 404 — 5 inbound `<router-link to="/help">` had no route | Added [`Help.vue`](frontend/src/views/Help.vue) + `/help` route in [`router/index.js`](frontend/src/router/index.js); footer link added in [`App.vue`](frontend/src/App.vue) |

### Observed but deferred

These were flagged during the pre-eval audit; the team chose not to action
them. Documented so the team isn't surprised mid-demo.

- **Debug coin button** on the production HUD ([`Game.vue:88`](frontend/src/games/Game.vue#L88)).
- **Residual `console.*`** in `backend/src/middleware/errorHandler.js` and a
  few `frontend/src/games/**` files.
- **No Tournament + alias flow** — not claimed by the README, not required
  by the subject revision in use.

---

## Recent activity (since 2026-04-07)

~120 commits landed across backend, frontend, infra, and tests. Highlights:

**Modules & claim accuracy**
- `cd326e6` — README realignment: dropped false claims (Organizations,
  Advanced Permissions); added WAF+Vault and Groq LLM as honest claims;
  corrected counts (27 models, 6 endpoints, 6 services, 30 req/min).
- `aa0f1e2` — GDPR + WAF credential leak + TLS hardening fixes.
- `a0504b0` — earlier README/ISSUES.md refresh against current structure.

**LLM helpdesk**
- `ef411b2` — Groq helpdesk shipped with a 3-key rotation for demo
  throughput.
- `ee5c352` — input length cap + Bearer auth check on the helpdesk route.
- `8cfe033` — guest-without-key path stops throwing; frontend handles
  gracefully.

**Game / engine work**
- `7f0ade8`, `2864b60`, `d513580`, `356a2d3` — Alpaca Road lobby polish,
  refactors, road-as-rectangle, dynamic-allocation cleanup.
- `9f53da4`, `81e266f`, `7adeb68`, `91642b3` — tickrate tuning,
  jump-spin-up, dynamic heart UI, server-side inactivity collision checks.
- `c44cf84`, `878bcfe`, `67facaf`, `9e71797`, `f8af320`, `a2464e8` —
  herd-size upgrades, max-herd guard, sell rounding fix, sell-before-buy
  fix, post-match return-to-farm cleanup.

**Frontend / UX**
- `a1a7117`, `6b7c9b0` — icon system extracted to a reusable `AppIcon`
  wrapper; emoji → SVG across HUD, helpdesk, posts, lobby.
- `671a40e` — achievements, leaderboard UI, bug fixes.
- `fd9d482` — private profiles visible, but data gated to non-friends.
- `1adec24` — blocked-user UX hardening (UI + explicit "Block" path on
  friend requests).

**Tests / CI / build**
- `9a2daef`, `5b0c33c`, `a425636`, `642abd5`, `ccb84f2`, `bdc7fbe`,
  `bfcb1de` — coverage for sockets, mock-mode fixes, validation rewrites.
- `b38995b`, `3751657`, `05cc1e6`, `566fc7c`, `02cdee5` — E2E navigation
  test cleanup against the actual route table (notably: tests no longer
  expect `/messages` or `/help`).
- `de6d0cc`, `9a52da8`, `403247f` — HTTPS on frontend, non-root Docker
  user, prod-build perf.

**Cleanup / housekeeping**
- `976a1b7` — console noise, dead localStorage token, silent catches.
- `bc555c9`, `054d25f`, `6b2f828` — debug-print removal, seed command,
  OpenAPI schema pruning.
- `87e115a`, `aaa828a`, `b72fb68`, `5273b5e` — prisma config dedupe, old
  vault path removed, indexing on view-tracking tables.

---

## In progress

| Item | Owner | Notes |
|------|-------|-------|
| **#7** PostgreSQL connection pooling (pgBouncer) | DavidPoetsch | Performance testing pending. Not required for eval. |
| **#11** Query / index audit | DavidPoetsch | Partial — view-tracking indexes landed in `5273b5e`. Not required for eval. |

Both items improve production resilience but do not affect any claimed
module's demo path.

---

## Historical record — completed issues

Kept intentionally short; the live status is the module table above. For
the full PR-by-PR history, use `git log`.

| # | Theme | Status |
|---|-------|--------|
| #1 | User profiles + avatar upload | ✅ |
| #2 | Friends system (add/accept/decline/block) | ✅ |
| #3 | Direct messaging | ✅ |
| #4 | Group chat rooms with roles | ✅ |
| #5 | Social feed (posts, likes, comments, reposts) | ✅ |
| #8 | Auth: email/password + JWT + bcrypt | ✅ |
| #9 | File upload (MIME whitelist, 10 MB cap, hashed names) | ✅ |
| #12 | Real-time WebSockets | ✅ |
| #13 | Socket event handlers | ✅ |
| #14 | 3D alpaca farm | ✅ |
| #15 | Three.js advanced graphics | ✅ |
| #16 | OAuth 2.0 (Google + GitHub) | ✅ |
| #17 | GDPR (export + deletion + grace period) | ✅ |
| #19 | Gamification (XP, achievements, leaderboard) | ✅ |
| #20 | Game stats & match history | ✅ |
| #21 | Public API (6 endpoints, X-API-Key, rate limit) | ✅ |
| #22 | Notification system | ✅ |
| #23 | HTTPS, nginx reverse proxy, WebSocket proxying | ✅ |
| #30 | Prisma ORM migration (27 models) | ✅ |
| #31 | Vault + ModSecurity WAF | ✅ |
| #32 | Swagger docs (`/api/docs`) | ✅ |

---

## Team & responsibilities

| Member | Role | Primary focus |
|--------|------|---------------|
| **ValGSgit** | Product Owner / Project Manager / Developer | Backend services, public API, gamification, helpdesk, infra |
| **DavidPoetsch** | Technical Lead / Developer | Database, Prisma, nginx, deployment |
| **fankahou** | Developer | Frontend views, 3D game world, UI/design |
| **LukasStefanek** | Developer | Frontend, 3D game logic, real-time game loop |

### File ownership

| Area | Owner | Backup |
|------|-------|--------|
| `backend/src/config/`, vault, infra | ValGSgit | DavidPoetsch |
| `backend/src/controllers/`, `routes/`, `services/` | ValGSgit | DavidPoetsch |
| `backend/src/services/spitRoyaleNamespace.js`, `alpacaRoadNamespace.js`, `MatchManager.js` | ValGSgit | LukasStefanek |
| `backend/prisma/`, `database/`, query work | DavidPoetsch | ValGSgit |
| `frontend/src/views/`, `components/`, `style.css` | fankahou | LukasStefanek |
| `frontend/src/games/` (Three.js + game loop) | LukasStefanek | fankahou |
| `nginx/`, `compose*.yaml`, `Makefile` | DavidPoetsch | ValGSgit |

---

## Key metrics

- **Module points claimed**: 28 (10 Major × 2 + 8 Minor × 1).
- **Subject threshold**: 14 → met with 14 pts of headroom.
- **Endpoints**: ~70 REST routes across 8 route modules; 6 of them on the
  X-API-Key-gated public surface (`backend/src/routes/public.js`).
- **Prisma models**: 27.
- **Production services** (`compose.prod.yaml`): 6 — nginx, postgres,
  vault, vault-init (one-shot), frontend, backend.
- **Public API rate limit**: 30 req/min per key.
- **Tests**: Jest (backend), Vitest (frontend), Playwright E2E.

---

## Document history

| Date | Author | Changes |
|------|--------|---------|
| 2024-03-13 | ValGSgit (PO) | Initial ISSUES.md with ownership, status, backlog. |
| 2026-03-18 | ValGSgit (PO) | Ownership separation; added vault, prisma, scripts, shared. Moved #30/#31 to in-progress. |
| 2026-03-21 | ValGSgit (PO) | SpitRoyale consolidation: standalone server retired, served via Socket.IO namespace. |
| 2026-04-07 | ValGSgit (PO) | Codebase audit: confirmed #30, #31, #32 done; updated completion to 24/29. |
| 2026-05-11 | ValGSgit (PO) | Full rewrite. Aligned to README's 28-pt / 18-module table (removed Organizations + Advanced Permissions claims). Corrected counts (27 models, 6 endpoints, 6 services, 30 req/min). Dropped April sprint plan and obsolete cleanup notes. Logged ~120 post-April-7 commits. Fixed `/help` route as part of the audit. |

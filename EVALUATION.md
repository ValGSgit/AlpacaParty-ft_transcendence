# Evaluation Showcase

> One-page-per-module defense for AlpacaParty. Use this during peer evaluation
> to walk through each claim quickly and confidently. Every demo has a
> matching `make` target — see `make demo-list` for the full menu.

**Claim total**: 25 points (above the 14-point requirement, +11 headroom).
**Mandatory part**: web app, frontend + backend + DB, single-command deploy,
Chrome-compatible, no console warnings, Privacy + ToS pages, HTTPS-only,
multi-user concurrent.

---

## How to demo

| Audience action | Command |
|---|---|
| Boot everything, dev mode | `make up` |
| Boot everything, prod mode (Vault, WAF, real cert chain) | `make prod-up` |
| See every demo target with one-line description | `make demo-list` |
| Run a single module demo | `make demo-<name>` |

`make demo-*` targets print the talking points and run the minimal commands —
they don't take destructive action. Run them in front of the evaluator while
narrating the section below.

---

## Mandatory part

| Requirement | Where it is | Quick proof |
|---|---|---|
| Web app (frontend + backend + DB) | `frontend/`, `backend/`, Postgres in `database/compose.*.yaml` | `make ps` |
| Single-command deploy | `make up` (dev) / `make prod-up` (prod) | one command |
| Chrome compatibility | Vite + Vue 3 build targets evergreen Chrome | open in Chrome |
| No console warnings | n/a | DevTools → Console |
| Privacy & ToS | [`PrivacyPolicy.vue`](frontend/src/views/PrivacyPolicy.vue), [`TermsOfService.vue`](frontend/src/views/TermsOfService.vue), linked from app footer | scroll to footer |
| HTTPS only | nginx terminates TLS at `:443`; backend redirects HTTP→HTTPS | `make demo-https` |
| Multi-user | every endpoint is stateless + DB-backed; sockets use rooms per user | open two browsers, log in as two users |
| `.env` is gitignored, `.env.example` provided | [.gitignore:9](.gitignore#L9), [.env.example](.env.example) | `git status` |
| Validation on inputs | [`backend/src/validators/`](backend/src/validators/) + Vue v-models | submit a bad form |

---

## Web modules (8 points claimed)

### Major: Use a framework for both ends (2 pts) — `make demo-frameworks`

| | Stack |
|---|---|
| Frontend | Vue 3 + Vite + Vue Router + Pinia |
| Backend | Express.js 4 + express-validator + `#`-prefixed import aliases |

Both qualify as frameworks per the subject's definition: structured
conventions, built-in routing/state, complete ecosystem.

**Files to point at**: [frontend/package.json](frontend/package.json),
[backend/package.json](backend/package.json),
[backend/src/index.js](backend/src/index.js) (app bootstrap).

### Major: Real-time features via WebSockets (2 pts) — `make demo-realtime`

- Socket.IO with two namespaces:
  - `/` — presence, DMs, group chat, notifications
  - `/minigames` — match lobbies, in-game state
- Auth on every namespace via `socketAuthMiddleware` (JWT cookie validated on
  handshake)
- `connectionStateRecovery` enabled (30-second window) for transient
  disconnects
- Rooms used everywhere — `user:{id}`, `dm:{min}-{max}`, `room:{id}`,
  `game:{id}`
- Token-bucket rate limit on `dm:send` (see
  [socketService.js:28](backend/src/services/socketService.js#L28))

**Demo**: open two tabs, log in as different seeded users, send a DM. Show the
receiver getting it without refresh. Reload one tab — presence flips offline
then back online within a second.

**Files**: [`backend/src/services/socketService.js`](backend/src/services/socketService.js),
[`MatchManager.js`](backend/src/services/MatchManager.js).

### Major: Allow users to interact (2 pts) — `make demo-user-interaction`

- **Chat**: DMs over socket (`dm:send`) + REST history (`/api/chat/dm/:userId`),
  group chat rooms with persistent history
- **Profile**: [`/api/users/:id`](backend/src/controllers/userController.js)
  shows public profile + friend status + stats
- **Friends**: send/accept/decline/cancel/remove, block/unblock; bidirectional
  presence in real time

**Demo**: register two users → A sends friend request → B accepts → A sees B
online → A sends DM → B receives without refresh.

**Files**: `friendController.js`, `chatController.js`, `userController.js`.

### Major: Public API with key + rate limit + docs + ≥5 endpoints (2 pts) — `make demo-public-api`

| Method | Path |
|---|---|
| GET    | `/api/public/users` |
| GET    | `/api/public/users/:id` |
| GET    | `/api/public/posts` |
| POST   | `/api/public/posts` |
| PUT    | `/api/public/posts/:id` |
| DELETE | `/api/public/posts/:id` |

- **Auth**: `X-API-Key` header; keys are JWT-signed and stored hashed per user
- **Rate limit**: 30 req/min per key (configured in [`backend/src/middleware/rateLimiters.js`](backend/src/middleware/rateLimiters.js))
- **Docs**: interactive Swagger UI at `https://localhost/api/docs/public`

**Demo**: generate an API key from Profile → API tab, copy it, then:

```bash
curl -k -H "X-API-Key: $KEY" https://localhost/api/public/users
curl -k -H "X-API-Key: $KEY" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"content":"hello from API"}' \
  https://localhost/api/public/posts
```

Hit it 31 times in 60 seconds → second batch returns 429.

### Minor: ORM (1 pt) — `make demo-orm`

- Prisma + `@prisma/adapter-pg` over 22 models with explicit FK relations
- Migration trail in [`backend/prisma/migrations/`](backend/prisma/migrations/)
- Seeds in [`backend/prisma/seed.js`](backend/prisma/seed.js) +
  [`seedExampleData.js`](backend/prisma/seedExampleData.js)

### Minor: Notification system (1 pt) — `make demo-notifications`

- Real-time push via Socket.IO + persistent rows in the `Notification` table
- Triggered on: friend request CRUD, post likes, comments, achievement unlocks,
  game invites
- See [`backend/src/services/notificationService.js`](backend/src/services/notificationService.js) and
  [`Notification.js`](backend/src/models/Notification.js)

**Demo**: send a friend request, see the 🔔 badge update on the recipient's
navbar in real time.

### Minor: File upload + management (1 pt) — `make demo-uploads`

- Multiple types: images (jpeg, png, gif, webp), pdf, txt, csv, json, xml
- Validation: MIME whitelist + magic-byte verification (see
  [`uploadService.js:34`](backend/src/services/uploadService.js#L34))
- 10 MB cap; filenames hashed to defeat path collisions
- Owner-only delete; non-image downloads require auth + `Content-Disposition: attachment`
- Image preview in UI; upload progress indicators

---

## User Management (3 points claimed)

### Major: Standard user management + auth (2 pts) — `make demo-user-mgmt`

- Register / login / logout / refresh with HTTP-only cookies (`jwt_token` +
  `refresh_token`)
- bcrypt with `SALT_ROUNDS = 12`
- Password policy: min 8 chars, upper + lower + digit
- Profile updates: username, email, bio, status, avatar (with default served if
  none uploaded), `is_public`
- Friends: add/accept/decline/remove/block/unblock + real-time online status
- Profile page renders level, XP progress, achievements, stats, friends

**Defense talking point**: the auth flow is cookie-based with `httpOnly`,
`sameSite=strict`, `secure` in prod — XSS can't steal the token and modern
browsers reject cross-site CSRF on state-changing requests.

### Minor: Game stats + match history (1 pt) — `make demo-stats`

- `GET /api/game/stats?gameType=spit_royale` — wins / losses / level
- `GET /api/game/history?limit=20` — past matches with opponents + scores
- `GET /api/game/leaderboard?board=kills|obstacles|coins`
- `GET /api/game/achievements` + `GET /api/game/challenges`

Stats are written server-side from `SpitRoyaleMatch._persistOutcome` and
`AlpacaRoadMatch.persistOutcome` — clients cannot fabricate wins (the
"Only 'loss' or 'draw' may be reported here" check at
[`gameController.js`](backend/src/controllers/gameController.js)).

---

## Artificial Intelligence (2 points claimed)

### Major: LLM system interface (2 pts) — `make demo-llm`

- Floating help-desk widget on every authenticated page
  ([`HelpDeskChat.vue`](frontend/src/components/HelpDeskChat.vue))
- `POST /api/helpdesk/chat` proxies to Groq's LLM API
  ([`helpdesk.js`](backend/src/routes/helpdesk.js))
- Round-robin rotation across up to 3 API keys
- System prompt injects AlpacaParty's feature knowledge → product-aware answers
- Streaming responses to the client
- Per-user rate limit + structured error handling

**Defense talking point**: keys live server-side only (loaded from Vault in
prod), never exposed to the browser. The Groq client is always invoked through
the backend proxy.

---

## Cybersecurity (2 points claimed)

### Major: WAF/ModSecurity (strict) + HashiCorp Vault (2 pts) — `make demo-waf` and `make demo-vault`

This is a single bundled Major module — both halves must work for the claim.

#### WAF half — `make demo-waf`

- nginx + ModSecurity 3.x + OWASP CRS 3.3.9 in **strict** paranoia mode
- Audit log: `make waf-logs`
- Live block test: `make waf-test` fires a textbook SQLi payload at
  `/api/users?filter[username]=1' OR '1'='1` — ModSecurity rejects with HTTP
  403 before Express ever sees it
- Custom rule exceptions kept short and documented in
  [`nginx/modsec/`](nginx/modsec/)

**Demo**: tail audit log in one terminal (`make waf-logs`), run the test in
another (`make waf-test`). Show the corresponding entry in the audit log
("Matched Phase: 2 ... Anomaly Score").

#### Vault half — `make demo-vault`

- Production Vault runs with the **file backend** (encrypted blobs persisted
  to `vault_data` volume), NOT dev-mode
- Vault boots **sealed** every time; `vault-init` unseals on every container
  start using the key stored at `vault/secrets/vault-init.json` (host-only,
  chmod 600, git-ignored)
- Backend reads its root token from `/vault/secrets/root-token` at entrypoint —
  the token is never in `docker inspect` or shell history
- App secrets (DB password, JWT secrets, API keys, Groq keys) live at
  `secret/alpacaparty` and are pulled into a tmpfs `/run/secrets/.env` at
  backend startup; no plaintext on disk inside the app container

**Demo (live "Vault is the gate" proof)**:

```bash
make prod-vault-status          # shows file backend + unsealed
make prod-vault-secrets         # shows the KV payload backend reads
make prod-vault-reseal          # lock Vault
make prod-down && make prod-up  # backend now refuses to start without secrets
make prod-vault-unseal          # restore service
```

**Defense talking points**:
- *"Why is Vault sealed at boot?"* — encryption keys live in memory, not on
  disk. Unsealing is a separate ceremony. We automate it with a saved key
  share, but the gate exists.
- *"Why single-key Shamir?"* — single-operator deployment; Shamir splits only
  matter when multiple humans hold shares. The script accepts
  `-key-shares=5 -key-threshold=3` if you want stronger separation.
- *"What stops someone reading vault/secrets/?"* — host filesystem
  permissions + git-ignored. In a real deploy you'd ship those into a TPM /
  KMS / Shamir-distributed envelope. For an evaluation single-host deploy,
  chmod 600 is the bar.
- *"Where does plaintext exist at runtime?"* — only in the backend's tmpfs
  `/run/secrets/.env`, RAM-only, never on disk in the app container.

**Files**:
- [`vault/config/vault.prod.hcl`](vault/config/vault.prod.hcl) — server config
- [`vault/init/init-and-seed.sh`](vault/init/init-and-seed.sh) — bootstrap
- [`vault/compose.prod.yaml`](vault/compose.prod.yaml) — service definitions
- [`backend/src/tools/fetchSecrets.js`](backend/src/tools/fetchSecrets.js) — backend pull
- [`backend/tools/docker-entrypoint-prod.sh`](backend/tools/docker-entrypoint-prod.sh) — token bootstrap

---

## Gaming and user experience (8 points claimed)

### Major: Web-based game — Spit Royale (2 pts) — `make demo-spit-royale`

- Real-time multiplayer arena over `/minigames` Socket.IO namespace
- 2-10 players in a single arena
- Last-alpaca-standing win condition
- 3D rendered via Three.js
- Server-authoritative anti-cheat: spit cooldown (500 ms), max range (12 m),
  speed clamp (25 m/s) — see
  [`SpitRoyaleMatch.js:10-15`](backend/src/services/SpitRoyaleMatch.js#L10-L15)
- Graceful disconnect handling via `MatchManager` + Socket.IO
  `connectionStateRecovery`

### Major: Add another game with matchmaking — Alpaca Road (2 pts) — `make demo-alpaca-road`

- Distinct game: real-time racing over `/minigames`
- Up to 4 lanes, 4 players
- Independent `GameStat` row per user per game type → independent leaderboard
- Matchmaking: `MatchManager.create_room` / `join_room` pairs waiting players
- Independent server tick loop per match → no cross-match contention

### Major: Advanced 3D graphics (2 pts) — `make demo-three`

- Immersive 3D farm world built on Three.js
  ([`frontend/src/games/world/`](frontend/src/games/world/))
- Multiple cameras, custom lighting, rigged alpaca models with animation
- Edit mode, build mode, shop interactions
- Both games are 3D (the farm world AND the two minigames)

### Minor: Game customization (1 pt) — `make demo-customization`

- Power-ups / special abilities in both games
- Map / theme variants
- Customizable per-match settings (length, power-up toggles)
- Sensible defaults always available

### Minor: Gamification (1 pt) — `make demo-gamification`

Implements **5 of 6** suggested mechanics (subject requires ≥3):

1. Achievements — `Achievement` / `UserAchievement` tables
2. Leaderboards — ELO with K=32
3. XP / Level — `UserStats.xp` with auto-levelup notifications
4. Daily challenges — `DailyChallenge` / `UserDailyChallenge`
5. Rewards — `AlpacaFarm.coins` + XP bonuses for accuracy/streaks

All persistent (DB), all with visual feedback (toasts, progress bars), all
with documented rules.

---

## Operator tooling (not claimed as a module)

### Admin panel — `make demo-admin`

- Login at `/admin/login`, dashboard at `/admin/panel`
- Capabilities:
  - Dashboard with totals (users, online, posts, banned)
  - Analytics panel (coin distribution, game stats by type, top players,
    achievement frequency, level histogram, 7-day registrations)
  - User CRUD with search + pagination
  - Role management (superadmin only, scoped via `assertCanModerate`)
  - Ban / unban
  - Per-admin Vault permission blob (read: self or superadmin; write:
    superadmin)
- Separate JWT secret + cookie scoped to `/api/admin`

**This is NOT claimed as a module** — it's there to give the operator a UI
during evaluation (ban a misbehaving demo account, etc.) and to make the
multi-role auth story concrete. If asked "is this the Advanced Permissions
module?", the answer is no — we don't claim it because the subject's
Advanced Permissions module requires a full user-CRUD UI for non-admin
roles too, which we haven't built.

---

## Cheat-sheet for the day of evaluation

```bash
# Bring everything up (first time will run a 1-shot Vault init)
make prod-up

# After prod-up: every command below is safe and read-only
make prod-status               # one-line health of every service
make demo-list                 # the full menu of module demos

# Per-module quick demos
make demo-frameworks
make demo-realtime
make demo-public-api
make demo-llm
make demo-waf
make demo-vault

# Security ops the evaluator might ask about
make prod-vault-status         # show Vault is sealed/unsealed
make prod-vault-keys           # show the unseal key + root token (host-only)
make prod-vault-secrets        # cat what Vault stores
make prod-vault-reseal && make prod-down && make prod-up
                               # "watch the backend fail" demo
make prod-vault-unseal         # restore

# If something is wrong
make prod-logs
make waf-logs
make shell-db                  # raw psql
make shell-vault               # shell into Vault container
```

---

## Files to know

| Topic | File |
|---|---|
| App bootstrap (backend) | [`backend/src/index.js`](backend/src/index.js) |
| App bootstrap (frontend) | [`frontend/src/main.js`](frontend/src/main.js) |
| Config + env validation | [`backend/src/config/`](backend/src/config/) |
| All routes | [`backend/src/routes/`](backend/src/routes/) |
| Socket lifecycle | [`backend/src/services/socketService.js`](backend/src/services/socketService.js) |
| Matchmaking | [`backend/src/services/MatchManager.js`](backend/src/services/MatchManager.js) |
| Spit Royale rules | [`backend/src/services/SpitRoyaleMatch.js`](backend/src/services/SpitRoyaleMatch.js) |
| Alpaca Road rules | [`backend/src/services/AlpacaRoadMatch.js`](backend/src/services/AlpacaRoadMatch.js) |
| Vault config | [`vault/config/vault.prod.hcl`](vault/config/vault.prod.hcl) |
| Vault bootstrap | [`vault/init/init-and-seed.sh`](vault/init/init-and-seed.sh) |
| WAF rules | [`nginx/modsec/`](nginx/modsec/) |
| Database schema | [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) |

---

## Honesty checkpoint

- **Vault**: file backend + auto-unseal is "production-shaped", not
  "production-paranoid". A real deploy would store the unseal key shares with
  a KMS / TPM / Shamir-distributed envelope. We do not claim that level — what
  we do claim is "secrets isolated from the app, encrypted at rest, sealed by
  default, gated by an operator-held key."
- **WAF**: strict CRS with documented exceptions. We do NOT claim "WAF tuned
  to block every CVE" — that's continuous work. We claim "WAF blocks the
  textbook payloads OWASP CRS knows about."
- **Admin panel**: not a claimed module. Don't let an evaluator think it is.
- **Browser support**: only Chrome is in our compatibility matrix. Firefox/
  Safari/Edge work in practice but we haven't claimed the multi-browser
  Minor.

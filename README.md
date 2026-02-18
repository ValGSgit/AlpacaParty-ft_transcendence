# Cleanscendence

> 42 Transcendence — Vue 3 + Express.js + PostgreSQL + Docker + nginx + Socket.io + Three.js

## Team

| Dev | Areas |
|-----|-------|
| **ValGSgit** | Product Owner · Docker · Makefile · .env · Auth · API · PostgreSQL |
| **DavidPoetsch** | nginx · Backend · PostgreSQL |
| **fankahou** | Frontend · Game Core · 3D Graphics |
| **LukasStefanek** | Frontend · Game Core · 3D Graphics |

## Quick Start

```bash
# 1. Clone & copy env
cp .env.example .env          # edit passwords / secrets

# 2a. Docker (recommended)
make build && make up          # http://localhost:8080

# 2b. Local dev (without Docker)
make install && make dev       # frontend :5173, backend :3000
```


---

## Architecture — System Overview

```mermaid
graph TB
    subgraph Client["🌐 Client (Browser)"]
        VUE["Vue 3 + Vite SPA\n(port 5173)"]
    end

    subgraph Proxy["🔀 nginx (port 8080)"]
        NGINX["Reverse Proxy\n/api → backend\n/ → frontend"]
    end

    subgraph Backend["⚙️ Express.js API (port 3000)"]
        direction TB
        IDX["index.js\nEntry Point"]

        subgraph Middleware["Middleware"]
            HELMET["helmet\n(security headers)"]
            CORS["cors"]
            RATE["rate-limit\n(100 req / 15 min)"]
            AUTH_MW["authenticate()\nJWT guard"]
            ERR["errorHandler"]
        end

        subgraph Routes["Routes  /api/..."]
            HEALTH["/health"]
            AUTH_R["/auth"]
            USER_R["/users"]
            FUTURE["/friends  /chat  /game\n(planned)"]
        end

        subgraph Controllers["Controllers"]
            AUTH_C["authController\nregister · login · logout\nrefresh · me"]
            USER_C["userController\ngetMe · updateMe\nchangePassword · listUsers · getUser"]
        end

        subgraph Services["Services"]
            AUTH_S["authService\nbcrypt hash · JWT sign/verify"]
        end

        subgraph Models["Models"]
            USER_M["User\ncreate · findById · findByEmail\nfindByUsername · update · delete"]
        end

        subgraph Config["Config"]
            CFG["config/index.js\nport · jwt · db · cors · rateLimit"]
            DB_CFG["config/database.js\npg pool"]
        end
    end

    subgraph Database["🗄️ PostgreSQL (port 5432)"]
        direction TB
        USERS["users"]
        FRIENDS["friends\nfriend_requests"]
        BLOCKED["blocked_users"]
        MESSAGES["messages"]
        MATCHES["match_history\n(planned)"]
    end

    subgraph Tests["🧪 Tests (Jest + Supertest)"]
        UNIT["Unit Tests\nconfig · middleware · services"]
        INT["Integration Tests\nauth · users · health routes"]
    end

    subgraph E2E["🎭 E2E (Playwright)"]
        E2E_T["auth · navigation · profile specs"]
    end

    VUE -->|"HTTP / WS"| NGINX
    NGINX -->|"/api/*"| IDX
    NGINX -->|"/"| VUE

    IDX --> HELMET & CORS & RATE
    IDX --> AUTH_R & USER_R & HEALTH

    AUTH_R --> AUTH_C
    USER_R --> AUTH_MW --> USER_C

    AUTH_C --> AUTH_S --> USER_M
    USER_C --> USER_M

    USER_M --> DB_CFG --> Database

    CFG -.->|"reads env vars"| AUTH_S
    CFG -.->|"reads env vars"| DB_CFG

    ERR -.->|"catches all errors"| IDX

    Tests -.-> Backend
    E2E -.-> Client
```

## Architecture — Request Lifecycle

```
Browser / Client
      │
      ▼
  nginx :8080
      │  /api/*
      ▼
  index.js
      │
      ├─► helmet (security headers)
      ├─► cors
      ├─► express-rate-limit  (100 req / 15 min per IP)
      ├─► express.json body parser
      │
      ├─► /api/health  ────────────────────────────► 200 OK
      │
      ├─► /api/auth/*
      │       └─► authController
      │                └─► authService  (bcrypt / JWT)
      │                        └─► User model  (pg pool)
      │                                └─► PostgreSQL
      │
      └─► /api/users/*
              └─► authenticate()  ← JWT guard
                      └─► userController
                               └─► User model  (pg pool)
                                       └─► PostgreSQL
```

---

## Services (Docker)

| Service | Container | Port |
|---------|-----------|------|
| nginx | cleanscendence_nginx | **8080** → 80 |
| frontend | cleanscendence_frontend | 5173 |
| backend | cleanscendence_backend | 3000 |
| postgres | cleanscendence_db | 5432 |

## Issue Tracker

See [GitHub Issues](https://github.com/ValGSgit/Cleanscendence/issues) for the full backlog.

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
    subgraph INFRA["🐳 Infrastructure"]
        NGINX["nginx/nginx.conf(reverse proxy :80)"]
    end

    subgraph FE["🖥️ Frontend  (Vite + Vue 3)"]
        MAIN["main.js(mounts app, router, pinia,fetchUser before router)"]

        subgraph FVIEWS["Views"]
            HOME["Home.vue"]
            LOGIN["Login.vue"]
            REGISTER["Register.vue"]
            PROFILE["Profile.vue"]
        end

        subgraph FROUTER["Router"]
            ROUTER["router/index.js(beforeEach guard)"]
        end

        subgraph FSTORES["Pinia Stores"]
            AUTHSTORE["stores/auth.js(user, tokens, login,logout, fetchUser)"]
        end

        subgraph FSERVICES["Services"]
            API["services/api.js(axios + interceptors)"]
            SOCKET["services/socket.js(socket.io-client)"]
        end

        subgraph FTESTS["Frontend Tests (Vitest)"]
            APPT["App.test.js"]
            ROUTERT["router/router.test.js"]
            AUTHT["stores/auth.test.js"]
            HOMET["views/Home.test.js"]
            LOGINT["views/Login.test.js"]
            PROFILET["views/Profile.test.js"]
            REGISTERT["views/Register.test.js"]
        end
    end

    subgraph BE["⚙️ Backend  (Node + Express)"]
        INDEX["src/index.js(entry point)"]

        subgraph BCONFIG["Config"]
            CFG["config/index.js(jwt, db, oauth, urls)"]
            DBCFG["config/database.js\n(pg pool)"]
        end

        subgraph BROUTES["Routes"]
            ROUTEIDX["routes/index.js(/api/health)"]
            AUTHRT["routes/auth.js(/api/auth/*)"]
            USERSRT["routes/users.js(/api/users/*)"]
        end

        subgraph BCONTROLLERS["Controllers"]
            AUTHCTRL["authController.js(register, login, refresh,logout, oauth callbacks)"]
            USERCTRL["userController.js(getMe, getUser,updateMe, searchUsers)"]
        end

        subgraph BMIDDLEWARE["Middleware"]
            AUTHMW["auth.js(requireAuth,optionalAuth)"]
            ERRMW["errorHandler.js(notFound, errorHandler)"]
        end

        subgraph BMODELS["Models"]
            USERMODEL["User.js(findById, findByUsername,create, update,updatePassword, search)"]
        end

        subgraph BSERVICES["Services"]
            AUTHSVC["authService.js(hashPassword, validatePassword,generateTokens, verifyToken)"]
        end

        subgraph BTESTS["Backend Tests (Jest)"]
            subgraph BUNIT["Unit"]
                UCFG["config/config.test.js"]
                UAUTHMW["middleware/auth.test.js"]
                UERRMW["middleware/errorHandler.test.js"]
                UMODEL["models/user.test.js"]
                USVC["services/authService.test.js"]
            end
            subgraph BINT["Integration"]
                IAUTH["auth.routes.test.js"]
                IUSERS["users.routes.test.js"]
                IHEALTH["health.routes.test.js"]
            end
        end
    end

    subgraph DB["🗄️ Database"]
        PG[("PostgreSQL\n(users table)")]
    end

    subgraph E2E["🎭 E2E  (Playwright)"]
        EAUTH["auth.spec.js(register, login, logout)"]
        ENAV["navigation.spec.js(guards, route redirects,API health)"]
        EPROF["profile.spec.js(profile data,avatar, join date)"]
    end

    subgraph CI["⚡ CI/CD (.github/workflows/ci.yml)"]
        CIJOBS["backend-unit\frontend-unit\e2e"]
    end

    %% Infrastructure routing
    NGINX -->|"/api/* → :3000"| INDEX
    NGINX -->|"/* → :8080"| MAIN

    %% Frontend internal
    MAIN --> ROUTER
    MAIN --> AUTHSTORE
    ROUTER -->|"guards"| FVIEWS
    FVIEWS --> AUTHSTORE
    AUTHSTORE --> API
    API -->|"HTTP /api/*"| NGINX
    SOCKET -->|"WS"| NGINX

    %% Backend internal
    INDEX --> ROUTEIDX
    INDEX --> AUTHRT
    INDEX --> USERSRT
    INDEX --> ERRMW
    AUTHRT --> AUTHMW
    AUTHRT --> AUTHCTRL
    USERSRT --> AUTHMW
    USERSRT --> USERCTRL
    AUTHCTRL --> AUTHSVC
    AUTHCTRL --> USERMODEL
    USERCTRL --> USERMODEL
    AUTHMW --> AUTHSVC
    AUTHSVC --> CFG
    USERMODEL --> DBCFG
    DBCFG --> PG

    %% E2E hits nginx
    E2E -->|"browser → :8080"| NGINX
    E2E -->|"request → /api"| NGINX

    %% CI runs all test suites
    CI -->|"npm test"| BTESTS
    CI -->|"npm test"| FTESTS
    CI -->|"playwright test"| E2E

    %% Styles
    classDef infra fill:#313244,color:#cdd6f4,stroke:#fab387,stroke-width:2px
    classDef fe fill:#1e1e2e,color:#cdd6f4,stroke:#89dceb,stroke-width:2px
    classDef be fill:#1e1e2e,color:#cdd6f4,stroke:#a6e3a1,stroke-width:2px
    classDef db fill:#181825,color:#cdd6f4,stroke:#cba6f7,stroke-width:2px
    classDef e2e fill:#1e1e2e,color:#cdd6f4,stroke:#f38ba8,stroke-width:2px
    classDef ci fill:#1e1e2e,color:#cdd6f4,stroke:#f9e2af,stroke-width:2px
    classDef test fill:#11111b,color:#a6adc8,stroke:#585b70,stroke-width:1px

    class NGINX infra
    class MAIN,HOME,LOGIN,REGISTER,PROFILE,ROUTER,AUTHSTORE,API,SOCKET fe
    class INDEX,CFG,DBCFG,ROUTEIDX,AUTHRT,USERSRT,AUTHCTRL,USERCTRL,AUTHMW,ERRMW,USERMODEL,AUTHSVC be
    class PG db
    class EAUTH,ENAV,EPROF e2e
    class CIJOBS ci
    class APPT,ROUTERT,AUTHT,HOMET,LOGINT,PROFILET,REGISTERT,UCFG,UAUTHMW,UERRMW,UMODEL,USVC,IAUTH,IUSERS,IHEALTH test
```

## Architecture — Request Lifecycle

```
.
├── backend/          Express.js API server
│   └── src/
│       ├── config/       Config & DB connection
│       ├── controllers/  Route handlers
│       ├── middleware/    Auth, error handling
│       ├── models/       Data access
│       ├── routes/       API routes
│       ├── services/     Business logic
│       └── utils/        Helpers
├── frontend/         Vue 3 + Vite SPA
│   └── src/
│       ├── components/   Reusable UI
│       ├── router/       Vue Router
│       ├── services/     API & Socket clients
│       ├── stores/       Pinia stores
│       └── views/        Page components
├── nginx/            Reverse proxy config
├── PostgreSQL/       DB init scripts
├── shared/           Shared game logic (Three.js)
├── docker-compose.yml
├── Makefile
└── .env.example
```

## Services (Docker)

| Service | Container | Port |
|---------|-----------|------|
| nginx | cleanscendence_nginx | **8080** → 80 |
| frontend | cleanscendence_frontend | 5173 |
| backend | cleanscendence_backend | 3000 |
| postgres | cleanscendence_db | 5432 |

## Issue Tracker

See [GitHub Issues](https://github.com/ValGSgit/Cleanscendence/issues) for the full backlog.


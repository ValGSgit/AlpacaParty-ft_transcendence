# 🐳 Docker Deployment Guide

This guide explains how to run AlpacaParty in a fully containerized environment without requiring any local dependencies or sudo access.

## Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)

**No sudo required** - you just need Docker installed and your user added to the docker group.

## Quick Start

### Development Mode

1. **Clone and navigate to the project:**
   ```bash
   cd /path/to/AlpacaParty
   ```

2. **Configure environment (optional):**
   ```bash
   # The .env file is already created with development defaults
   # Edit if you want to customize database credentials, etc.
   nano .env
   ```

3. **Start all services:**
   ```bash
   make up
   # OR
   docker compose up -d
   ```

4. **View logs:**
   ```bash
   make logs
   # OR
   docker compose logs -f
   ```

5. **Access the application:**
   - **Full application (recommended):** http://localhost:8443
   - Frontend (direct): http://localhost:5173
   - Backend API: http://localhost:3000/api
   - Database: postgresql://localhost:5432

### Production Mode

1. **Update environment for production:**
   ```bash
   make generate-secrets
   nano .env
   ```
   
   **Important changes for production:**
   - Set a strong `JWT_SECRET` (generate with `openssl rand -base64 32`)
   - Change `DB_PASSWORD` to a strong password
   - Ensure `DATABASE_URL` matches `DB_USER` / `DB_PASSWORD` / `DB_NAME`
   - Set `NODE_ENV=production`
   - Update `CORS_ORIGINS` to your domain
   - Update `VITE_API_URL` if needed

2. **Build and start production containers:**
   ```bash
   make prod-up
   # OR
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. **Access the application:**
   - Production app: http://localhost (or your configured port)

## Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      nginx:8443                          │
│                   (Reverse Proxy)                        │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
  ┌────────────────┐         ┌──────────────────┐
  │  Frontend:5173 │         │  Backend:3000    │
  │  (Vue 3+Vite)  │         │  (Express+WS)    │
  └────────────────┘         └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │  PostgreSQL      │
                             │  (postgres:16)   │
                             └──────────────────┘
```

## Available Commands

### Docker Commands (via Makefile)

```bash
make up              # Start all containers
make down            # Stop all containers
make build           # Rebuild all images
make logs            # View logs from all containers
make restart         # Restart all containers
make ps              # Show container status

make shell-backend   # Open shell in backend container
make shell-frontend  # Open shell in frontend container
make shell-db        # Open psql in database

make clean           # Stop containers and remove images
make clean-volumes   # Also remove persistent data (⚠️ destroys DB)
make fclean          # Full cleanup + prune dangling Docker images/build cache
```

### Direct Docker Compose Commands

**Development:**
```bash
docker compose up -d                    # Start in background
docker compose down                     # Stop all services
docker compose logs -f backend          # Follow logs for specific service
docker compose exec backend sh          # Shell into container
docker compose restart backend          # Restart specific service
```

**Production:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml logs -f
```

## Service Details

### PostgreSQL (postgres)
- **Image:** `postgres:16-alpine`
- **Port:** 5432 (dev only, not exposed in production)
- **Volume:** `pg_data` (persists database)
- **Init script:** `PostgreSQL/init.sql` runs on first startup

### Backend (backend)
- **Dev image:** Built from `backend/Dockerfile`
- **Prod image:** Built from `backend/Dockerfile.prod`
- **Port:** 3000 (only exposed in dev mode)
- **Hot reload:** Enabled in dev mode with `--watch`
- **Dependencies:** bcrypt, express, socket.io, pg, jsonwebtoken

### Frontend (frontend)
- **Dev image:** Built from `frontend/Dockerfile` (Vite dev server)
- **Prod image:** Built from `frontend/Dockerfile.prod` (Static nginx)
- **Port:** 5173 (dev only)
- **Hot reload:** Enabled in dev mode with Vite HMR
- **Framework:** Vue 3 + Vite + Pinia

### Nginx (nginx)
- **Image:** `nginx:alpine`
- **Port:** 8443 (dev) or 80 (prod)
- **Routes:**
  - `/api/*` → backend
  - `/socket.io/*` → backend (WebSocket)
  - `/*` → frontend

## Troubleshooting

### Services not starting

```bash
# Check service status
docker compose ps

# Check logs for errors
docker compose logs

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Database connection errors

```bash
# Wait for database to be ready
docker compose exec postgres pg_isready -U alpacaparty

# Check database logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Port already in use

If ports 5173, 3000, 5432, or 8443 are in use:

1. Edit `docker-compose.yml` and change the host port (left side):
   ```yaml
   ports:
     - "8081:80"  # Changed from 8443:80
   ```

2. Or stop conflicting services:
   ```bash
   lsof -i :8443  # Find what's using the port
   ```

### Permission issues

If you get permission errors:

```bash
# Ensure your user is in the docker group
sudo usermod -aG docker $USER

# Logout and login again, then test
docker ps
```

### Frontend can't connect to backend

Make sure you're accessing through nginx:
- ✅ Use: http://localhost:8443
- ❌ Don't use: http://localhost:5173 (direct frontend access won't work with API)

### Clear everything and start fresh

```bash
# WARNING: This will delete all data
docker compose down -v
docker system prune -af
docker compose up -d --build
```

## Production Deployment Checklist

- [ ] Generate strong `JWT_SECRET`
- [ ] Change `DB_PASSWORD`
- [ ] Update `CORS_ORIGINS` to production domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper domain/SSL (use reverse proxy like Traefik)
- [ ] Set up automatic backups for PostgreSQL volume
- [ ] Configure log aggregation
- [ ] Set up monitoring (health checks are already configured)
- [ ] Review and adjust nginx rate limiting if needed
- [ ] Consider using Docker secrets for sensitive data

## Backup and Restore

The app has two pieces of durable state, both of which must be backed up
together for a restore to succeed: **Postgres** (all user data, posts,
games, achievements) and **Vault** (DB password, JWT secrets,
API keys, Groq keys). A Postgres backup alone is
useless if Vault is lost — the backend won't know the DB password.

### What you're backing up

| Source                | Volume                | Holds                                        |
|-----------------------|-----------------------|----------------------------------------------|
| Postgres data         | `alpacaparty_pg_data` | All tables, rows, sequences                  |
| Vault file backend    | `alpacaparty_vault_data` | Encrypted KV store (secrets at rest)      |
| Vault unseal keys     | `alpacaparty_vault_keys` | Unseal key + root token written by vault-init |
| nginx / app TLS certs | `ssl/` on host        | Self-signed dev / prod certs                 |

### 1 — Snapshot everything (run weekly, before deploys)

The simplest reliable backup is a logical Postgres dump plus a tarball
of the Vault volumes while Vault is sealed. Saves a single archive per
day under `./backups/`:

```bash
# 0. Get a stable timestamp and a place to put the files.
TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p backups

# 1. Postgres — logical dump, gzipped. --clean drops + recreates
#    objects on restore so a partial DB doesn't refuse the import.
docker compose -f compose.prod.yaml exec -T postgres \
  pg_dump -U "$DB_USER" --clean --if-exists "$DB_NAME" \
  | gzip > "backups/pg-${TS}.sql.gz"

# 2. Vault — seal first so the file backend is in a consistent state,
#    snapshot the volumes, then unseal again. Vault accepts seal/unseal
#    over HTTPS using the token written by vault-init.
docker compose -f compose.prod.yaml exec -T vault \
  vault operator seal || true

docker run --rm \
  -v alpacaparty_vault_data:/vault/data:ro \
  -v alpacaparty_vault_keys:/vault/keys:ro \
  -v "$(pwd)/backups:/backup" \
  alpine tar czf "/backup/vault-${TS}.tar.gz" /vault/data /vault/keys

# 3. Re-unseal Vault so the backend stays alive.
make prod-vault-unseal
```

Why seal first: Vault writes to its file backend asynchronously while
running. Snapshotting a live volume can land in the middle of a write
and produce a corrupt archive that fails silently on restore. Sealing
forces a flush + read-only state for the duration of the tar.

### 2 — Restore a Postgres backup

```bash
# Stop the backend so no writes race the restore.
docker compose -f compose.prod.yaml stop backend

# Pipe the gzipped dump into psql. Postgres must be running.
gunzip -c backups/pg-20260526T020000Z.sql.gz \
  | docker compose -f compose.prod.yaml exec -T postgres \
      psql -U "$DB_USER" "$DB_NAME"

docker compose -f compose.prod.yaml start backend
```

The dump is taken with `--clean --if-exists`, so it will drop existing
tables before recreating them. If you need a non-destructive restore
into an empty database, re-dump without those flags.

### 3 — Restore Vault from a tarball

This is the harder path because Vault must be **stopped** while you
swap the file backend. The unseal key in the keys volume must match
the backend in the data volume — never mix-and-match snapshots.

```bash
# 1. Bring everything down. The vault_data + vault_keys volumes must
#    not be in use while we restore.
make prod-down

# 2. Wipe the existing volumes — restore is destructive by design.
docker volume rm alpacaparty_vault_data alpacaparty_vault_keys
docker volume create alpacaparty_vault_data
docker volume create alpacaparty_vault_keys

# 3. Extract the snapshot into the fresh volumes.
docker run --rm \
  -v alpacaparty_vault_data:/vault/data \
  -v alpacaparty_vault_keys:/vault/keys \
  -v "$(pwd)/backups:/backup:ro" \
  alpine sh -c "cd / && tar xzf /backup/vault-20260526T020000Z.tar.gz"

# 4. Boot the stack. vault-init detects an already-initialised
#    backend and skips the seed step; it will only unseal.
make prod-up
```

### 4 — Disaster recovery (lost host)

To rebuild from scratch on a new host:

1. Clone the repo and check out the same commit the backup was taken from.
2. Copy `backups/pg-*.sql.gz` and `backups/vault-*.tar.gz` to the new host.
3. `make ssl-certs` to mint fresh certs (the old certs are tied to the old IP).
4. `make prod-up` to create the volumes.
5. Run the **Vault restore** above (step 3) — the same snapshot puts the
   unseal key and root token back into `vault_keys` so the backend can
   read its secrets again.
6. Run the **Postgres restore** above (step 2).
7. `make prod-up` again — backend should come up healthy now that both
   secrets and data are in place.

### 5 — Verify a backup

A backup you've never restored is theoretical. Once a quarter:

```bash
# Spin a throwaway compose project pointing at a copy of the snapshot.
COMPOSE_PROJECT_NAME=alpacaparty_drill make prod-up
# Run the restore against the drill project.
# Hit /api/health and /api/admin/login to confirm both DB and Vault
# came back intact.
COMPOSE_PROJECT_NAME=alpacaparty_drill make prod-down
docker volume rm alpacaparty_drill_pg_data alpacaparty_drill_vault_data alpacaparty_drill_vault_keys
```

### Retention guidance

- Daily snapshots, kept 14 days.
- Weekly snapshots, kept 8 weeks.
- Monthly snapshots, kept 12 months.
- Encrypt the off-host copy — the Vault tarball contains the unseal key,
  which is equivalent to all production secrets.

### Backup Volume (raw tarball — last resort)

Useful for forensics or moving between hosts when Vault isn't involved
(dev only). Prefer the logical dump above for production:

```bash
docker run --rm -v alpacaparty_pg_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db-volume-backup.tar.gz /data
```

## Environment Variables Reference

See `.env.example` for complete documentation of all environment variables.

## Support

For issues and questions:
- GitHub Issues: https://github.com/ValGSgit/AlpacaParty/issues
- Check existing issues before creating new ones

## License

MIT License - See LICENSE file for details

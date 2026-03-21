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
   - **Full application (recommended):** http://localhost:8080
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
│                      nginx:8080                          │
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
- **Port:** 8080 (dev) or 80 (prod)
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

If ports 5173, 3000, 5432, or 8080 are in use:

1. Edit `docker-compose.yml` and change the host port (left side):
   ```yaml
   ports:
     - "8081:80"  # Changed from 8080:80
   ```

2. Or stop conflicting services:
   ```bash
   lsof -i :8080  # Find what's using the port
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
- ✅ Use: http://localhost:8080
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

### Backup Database
```bash
docker compose exec postgres pg_dump -U alpacaparty alpacaparty > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker compose exec -T postgres psql -U alpacaparty alpacaparty
```

### Backup Volume
```bash
docker run --rm -v alpacaparty_pg_data:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz /data
```

## Environment Variables Reference

See `.env.example` for complete documentation of all environment variables.

## Support

For issues and questions:
- GitHub Issues: https://github.com/ValGSgit/AlpacaParty/issues
- Check existing issues before creating new ones

## License

MIT License - See LICENSE file for details

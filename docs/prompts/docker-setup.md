# Docker Setup — Prompt

## Overview

Add a clean, reliable Docker-based local development environment for this Laravel project. The setup must be simple, Docker-native, production-like, and easy to maintain.

**First milestone**: `docker compose up -d` followed by `curl http://127.0.0.1:8080` returning the Laravel application successfully.

---

## Required Services

| # | Service | Image | Purpose |
|---|---|---|---|
| 1 | Laravel PHP + NGINX | `serversideup/php:8.4-fpm-nginx` | App + web server |
| 2 | MariaDB | `mariadb:11` | Database |
| 3 | Redis | `redis:7-alpine` | Cache / queue / sessions |
| 4 | Mailpit | `axllent/mailpit` | Local mail catcher |
| 5 | Vite/Node.js | `node:20-alpine` | Frontend asset dev server |

## Important Architecture Rule

Use `serversideup/php:8.4-fpm-nginx` for the Laravel application.

Do NOT create a custom NGINX process.
Do NOT install or run NGINX manually.
Do NOT use Supervisor to manage NGINX or PHP-FPM.
Do NOT use `network_mode: host`.
Do NOT create multiple competing NGINX configurations.

Let the serversideup image manage:

* NGINX
* PHP-FPM
* process supervision
* container startup
* healthcheck

Only add custom configuration when it is genuinely required.

## Docker Networking

Use the normal Docker Compose bridge network. Services communicate using Docker service names.

Inside the PHP container:

```env
DB_HOST=mysql
DB_PORT=3306

REDIS_HOST=redis
REDIS_PORT=6379
```

Never use `DB_HOST=127.0.0.1` / `DB_PORT=3307` or `REDIS_HOST=127.0.0.1` / `REDIS_PORT=6380` for container-to-container communication. Published host ports are only for host-machine access.

## Port Mapping

| Service | Host → Container |
|---|---|
| Laravel/Nginx | `8080 → 8080` |
| MariaDB | `3307 → 3306` |
| Redis | `6380 → 6379` |
| Mailpit Web UI | `8025 → 8025` |
| Mailpit SMTP | `1025 → 1025` |
| Vite | `5174 → 5173` |

Laravel app accessible at: `http://localhost:8080`

## PHP Configuration

```text
PHP_MEMORY_LIMIT=512M
PHP_UPLOAD_MAX_FILE_SIZE=100M
PHP_POST_MAX_SIZE=100M
NGINX_CLIENT_MAX_BODY_SIZE=100M
```

Disable OPcache for local development unless there is a specific reason to enable it.

## MariaDB

* Image: `mariadb:11`
* Database: `htut-ai`
* Persistent named volume
* Host port: `3307:3306`
* Proper MariaDB healthcheck
* Laravel connects internally with `DB_HOST=mysql`, `DB_PORT=3306`

## Redis

* Image: `redis:7-alpine`
* AOF persistence enabled (`--appendonly yes`)
* Persistent named volume
* Host port: `6380:6379`
* Redis healthcheck
* Laravel connects internally with `REDIS_HOST=redis`, `REDIS_PORT=6379`

## Mailpit

* Image: `axllent/mailpit`
* Ports: `8025:8025` (Web UI), `1025:1025` (SMTP)
* Laravel local mail config:

```env
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
```

* Mailpit Web UI: `http://localhost:8025`

## Node / Vite

* Image: `node:20-alpine`
* Working directory: `/var/www/html`
* Mount project source
* Named volume for `/var/www/html/node_modules`
* Run Vite with:

```bash
npm run dev -- --host
```

* Port: `5174:5173`
* Vite must be reachable from the host
* Do NOT reinstall dependencies on every container start; design install so it never repeatedly corrupts or renames existing `node_modules`

## Volumes

Persistent named volumes:

```text
mysql_data
redis_data
node_modules
```

Normal dev instructions must NOT use `docker compose down -v` (destroys database).

## Laravel Environment

`.env` must be compatible with the Docker network:

```env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=htut-ai
DB_USERNAME=root
DB_PASSWORD=...
```

```env
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=null
```

Session/cache drivers must work correctly with selected Laravel drivers.

**Important**: Do not assume database-backed session/cache tables exist — explain any required migrations (e.g., `php artisan migrate` includes `sessions`, `cache`, `jobs` tables which already exist in this project's migration set).

## Healthchecks

* PHP: test actual NGINX endpoint → `http://localhost:8080/healthcheck`
* MariaDB: proper healthcheck (`mariadb-admin ping`)
* Redis: proper healthcheck (`redis-cli ping`)
* Use `depends_on` with health conditions where appropriate

## NGINX

* Do NOT replace serversideup NGINX configuration
* No custom server block unless absolutely necessary
* No rate limiting, static caching, security locations, or other custom rules in initial setup
* First make default Laravel work; optional customization discussed only after basic setup confirmed

## Dockerfile

* NO custom PHP Dockerfile unless actually required
* Prefer official `serversideup/php:8.4-fpm-nginx` image directly from Docker Compose
* Never mix `FROM php:8.4-fpm` with serversideup architecture — this project uses **serversideup**

## Docker Compose

Create a clean, minimal, readable `docker-compose.yml`. No unnecessary services or configuration.

## Makefile

Provide useful commands (project does not currently have a Makefile — create one):

```text
make up        # docker compose up -d
make down      # stop containers (must NOT delete volumes)
make restart   # restart services
make logs      # tail logs
make shell     # bash into php container
make migrate   # php artisan migrate
make fresh     # migrate:fresh (DESTRUCTIVE — explicit confirmation)
```

Be careful with destructive commands. `make down` must NOT delete persistent volumes.

## Initial Setup Commands

Exact commands from a clean state (without destroying existing data):

```bash
cp .env.example .env          # if starting fresh (adjust DB/Redis hosts)
docker compose up -d
docker compose ps
docker compose logs php
docker compose exec php composer install   # first run only
docker compose exec php php artisan key:generate
docker compose exec php php artisan optimize:clear
docker compose exec php php artisan migrate
```

Verify:

* Laravel: `curl http://127.0.0.1:8080` or open `http://localhost:8080`
* Mailpit: `http://localhost:8025`

## Troubleshooting Section (short, diagnostic commands only)

Cover these issues — do NOT randomly modify UFW/host networking/Docker networking unless evidence points there:

1. `ERR_EMPTY_RESPONSE`
2. Laravel 500 errors
3. MySQL connection errors
4. Redis connection errors
5. Vite not loading
6. Port 8080 already in use
7. Docker container unhealthy
8. `node_modules` / npm installation problems

## Safety Rules

* Inspect existing project structure and `.env.example` / `.env` BEFORE writing config
* Do NOT blindly overwrite existing project configuration
* Keep the Docker setup as simple as possible
* Optional features (custom NGINX rules, rate limiting, Horizon, scheduler, production optimizations) come ONLY after the milestone works

## Acceptance Criteria

- [ ] `docker compose up -d` starts all 5 services healthy
- [ ] `curl http://127.0.0.1:8080` returns Laravel response
- [ ] `php artisan migrate` works inside container against MariaDB service
- [ ] Redis reachable from PHP container (`REDIS_HOST=redis`)
- [ ] Mailpit UI loads at `http://localhost:8025`
- [ ] Vite dev server reachable at `http://localhost:5174`
- [ ] `make down` preserves database volume
- [ ] Docs written → `docs/features/docker-setup.md`

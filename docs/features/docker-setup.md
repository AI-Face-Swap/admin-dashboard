# Docker Setup — Local Development Environment

## Overview

Complete Docker-based local development environment for HTUT AI using the `serversideup/php:8.4-fpm-nginx` architecture. The image manages NGINX, PHP-FPM, process supervision (S6 Overlay), startup, and healthchecks — no custom NGINX, no Supervisor config, no custom PHP Dockerfile.

## Services

| Service | Image | Host → Container | Purpose |
|---|---|---|---|
| `php` | `serversideup/php:8.4-fpm-nginx` | `8080 → 8080` | Laravel + NGINX + PHP-FPM |
| `mysql` | `mariadb:11` | `3307 → 3306` | Database (`htut-ai`) |
| `redis` | `redis:7-alpine` | `6380 → 6379` | Redis (AOF persistence) |
| `mailpit` | `axllent/mailpit` | `8025`, `1025` | Mail UI / SMTP |
| `node` | `node:20-alpine` | `5174 → 5174` | Vite dev server |

## URLs

- **Laravel**: http://localhost:8080
- **Mailpit**: http://localhost:8025
- **Vite**: http://localhost:5174

## Networking rule

Services talk over the compose bridge network using service names — set as real environment variables in `docker-compose.yml` (they override `.env` inside containers only; your local `.env` keeps working unchanged for non-Docker development):

```env
DB_HOST=mysql      DB_PORT=3306      # never 127.0.0.1:3307 inside containers
REDIS_HOST=redis   REDIS_PORT=6379   # never 127.0.0.1:6380 inside containers
MAIL_HOST=mailpit  MAIL_PORT=1025    MAIL_MAILER=smtp
APP_URL=http://localhost:8080
```

Host-published ports (3307, 6380, …) exist only for host-machine tools.

## Volumes

| Volume | Mount | Notes |
|---|---|---|
| `mysql_data` | `/var/lib/mysql` | Survives `docker compose down` |
| `redis_data` | `/data` | AOF persistence |
| `node_modules` | `/var/www/html/node_modules` | Installed once; restarts reuse it |

**Never run `docker compose down -v`** — it destroys the database.

## Makefile

```bash
make up              # start all services
make down            # stop (keeps all volumes)
make restart         # restart services
make ps              # status + health
make logs            # tail logs
make shell           # bash into php container
make migrate         # php artisan migrate --force
make fresh           # DESTRUCTIVE — asks confirmation, drops + reseeds DB
make optimize-clear  # clear Laravel caches
make npm-install     # install/update frontend deps in node container
make wayfinder       # regenerate Wayfinder typed routes (after route changes)
make tinker          # Tinker REPL
```

## First-time setup

```bash
cp .env.example .env    # only if .env does not exist yet
make up                 # or: docker compose up -d
docker compose ps       # wait until php/mysql/redis are healthy
docker compose exec php composer install        # first run only
docker compose exec php php artisan key:generate # only if APP_KEY empty
docker compose exec php php artisan optimize:clear
make migrate
make wayfinder          # generate typed routes into resources/js/wayfinder
```

Verify:

```bash
curl http://127.0.0.1:8080          # Laravel HTML
curl http://127.0.0.1:8080/healthcheck   # OK
```

Sessions/cache/queue use the `database` driver; their tables (`sessions`, `cache`, `jobs`) are created by the normal migrations.

## How it works

### Healthchecks

- `php`: NGINX-level probe of `http://localhost:8080/healthcheck`. The serversideup image answers this natively at NGINX layer (`OK`) — it proves NGINX + FPM are serving.
- `mysql`: official `healthcheck.sh --connect --innodb_initialized`
- `redis`: `redis-cli ping`
- `php` waits on mysql/redis via `depends_on.condition: service_healthy`.

### PHP limits & OPcache

```text
PHP_MEMORY_LIMIT=512M · PHP_UPLOAD_MAX_FILE_SIZE=100M
PHP_POST_MAX_SIZE=100M · NGINX_CLIENT_MAX_BODY_SIZE=100M
PHP_OPCACHE_ENABLE=0   # disabled for local dev
```

### Node / Vite

- Dependencies install **once** into the named volume (`[ -d node_modules/vite ] || npm install`). After changing `package.json`: `make npm-install`. Installs use `--no-save` so `package-lock.json` stays managed by the host — containers never rewrite it with platform-pruned entries.
- `vite.config.ts` reads `VITE_DEV_SERVER_PORT` (set to `5174` in compose): dev server listens on 5174 inside the container, published as-is. With the env var absent (host dev), behavior is exactly as before.
- `hmr.host=localhost` makes the hot file say `http://localhost:5174` so browser assets + HMR websocket resolve from the host.
- **Wayfinder**: the node container has no PHP, so the plugin's generation command is a no-op there (`VITE_WAYFINDER_COMMAND=true`). Types live in gitignored `resources/js/wayfinder`; regenerate with `make wayfinder` after changing routes/controllers — output lands in the shared bind mount instantly.

### MariaDB credentials

Taken from your `.env` by Compose variable substitution (`MARIADB_ROOT_PASSWORD=${DB_PASSWORD}`, `MARIADB_DATABASE=${DB_DATABASE:-htut-ai}`) — single source of truth, nothing duplicated.

## Troubleshooting

| Symptom | Diagnose |
|---|---|
| `ERR_EMPTY_RESPONSE` / blank page | `docker compose logs php --tail=50` — check NGINX/FPM started |
| Laravel 500 | `tail -50 storage/logs/laravel.log`; missing tables → `make migrate` |
| MySQL connection error | `docker compose exec php printenv \| grep DB_` must show `mysql:3306`; `docker compose logs mysql` |
| Redis connection error | `docker compose exec php printenv \| grep REDIS_` must show `redis:6379`; `docker compose exec redis redis-cli ping` |
| Vite not loading / assets 404 | `cat public/hot` → must be `http://localhost:5174`; check `node` service is Up and port 5174 free on host |
| Port 8080 busy | `lsof -i :8080`; or `APP_PORT=8081 make up` |
| Container unhealthy | `docker compose ps` then `docker compose logs <service> --tail=50` |
| `node_modules` problems | `docker compose down && docker volume rm htut-ai_node_modules && make up` (reinstalls fresh; DB safe) |

Do **not** change UFW/host networking/Docker networking unless diagnostics point there.

## Files added/changed

- `docker-compose.yml` — new
- `Makefile` — new
- `vite.config.ts` — env-driven dev server port + HMR host (host behavior unchanged)
- `.env.example` — Docker documentation comment block

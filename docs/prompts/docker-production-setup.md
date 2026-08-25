# Docker Production Setup — Prompt

## Overview

Add a production deployment path for HTUT AI: single VPS, domain `ai.htut.com`, direct HTTPS via Caddy (no Cloudflare), images built and pushed by GitHub Actions to GHCR, deployed over SSH with Docker Compose.

**Constraint**: domain may arrive later — stack must work over VPS IP / HTTP immediately, and gain automatic HTTPS the moment DNS resolves.

---

## Architecture

```
ai.htut.com ──A record──► VPS IP
   ▼
Caddy :80/:443  (automatic Let's Encrypt)
   │ reverse_proxy php:8080   (internal only)
   ▼
┌────────────────── single VPS ──────────────────┐
│ php        prod image · OPcache on · AUTORUN migrate
│ queue      same image · php artisan queue:work
│ scheduler  same image · php artisan schedule:work
│ mysql      mariadb:11  · internal ONLY (no published port)
│ redis      redis:7-alpine AOF · internal ONLY
└────────────────────────────────────────────────┘
```

## Deliverables

| # | File | Purpose |
|---|---|---|
| 1 | `Dockerfile` | Multi-stage prod image (see below) |
| 2 | `docker-compose.production.yml` | Prod stack, project name `htut-ai-prod` |
| 3 | `Caddyfile` | `${DOMAIN}` site block → `reverse_proxy php:8080` |
| 4 | `.env.production.example` | Production template (real `.env.production` is gitignored) |
| 5 | `.github/workflows/deploy.yml` | Build → GHCR → SSH deploy on push to `main` (+ manual dispatch) |
| 6 | `routes/console.php` | Schedule `CleanupStuckGenerations` daily (currently unscheduled) |
| 7 | `docs/features/docker-production-setup.md` | VPS first boot, DNS, deploy, rollback, logs |

## Dockerfile design (why multi-stage)

Wayfinder output (`resources/js/{actions,routes,wayfinder}`) is **gitignored**, so a fresh CI checkout cannot run `vite build` without generating it first — and the generator needs PHP.

```
Stage 1 "vendor":  serversideup/php:8.4-fpm-nginx
                   composer install --no-dev --optimize-autoloader
                   php artisan wayfinder:generate --with-form
Stage 2 "assets":  node:20-alpine
                   npm ci → copy app + wayfinder output from stage 1
                   VITE_WAYFINDER_COMMAND=true (no PHP here) → npm run build
Stage 3 "final":   serversideup/php:8.4-fpm-nginx
                   full source + vendor (stage 1) + public/build (stage 2)
```

No custom NGINX config, no Supervisor, no base-image switch — same architecture as dev.

## docker-compose.production.yml rules

* `name: htut-ai-prod` (separate volumes from dev stack)
* `php`: GHCR image (`ghcr.io/ai-face-swap/admin-dashboard`), **no published ports**, `AUTORUN_ENABLED=true` (auto-migrate on start), `PHP_OPCACHE_ENABLE=1`, healthcheck `/healthcheck`, `restart: unless-stopped`
* `caddy`: `caddy:2-alpine`, only service publishing 80/443, cert volumes persisted, `depends_on` php healthy
* `queue`: same image as php, command `php artisan queue:work --tries=3 --timeout=600` (matches 10-min video jobs), restart policy
* `scheduler`: same image, command `php artisan schedule:work`
* `mysql` / `redis`: healthchecks, named volumes, **no host ports at all**
* No Mailpit, no Node dev server in production
* Config via `env_file: .env.production` + compose variable substitution

## .env.production.example

Mirror of `.env` keys with production values:

```env
APP_ENV=production · APP_DEBUG=false · APP_URL=https://ai.htut.com
DB_HOST=mysql · DB_PORT=3306 · strong DB_PASSWORD placeholder
REDIS_HOST=redis · REDIS_PORT=6379
MAIL_* real SMTP placeholders (email phase lands later)
SANCTUM_STATEFUL_DOMAINS + SESSION_DOMAIN for ai.htut.com
LOG_LEVEL=info (not debug)
DOMAIN=ai.htut.com (consumed by Caddy)
```

## GitHub Actions workflow

1. Trigger: push to `main` + `workflow_dispatch`
2. Job 1 `build`: buildx → tags `latest` + short SHA → push to `ghcr.io/ai-face-swap/admin-dashboard` (login with built-in `GITHUB_TOKEN`)
3. Job 2 `deploy` (needs build): SSH via `ssh` CLI (no third-party actions) using secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` → on server: `docker compose -f docker-compose.production.yml pull && up -d --remove-orphans` (AUTORUN runs migrations)
4. Secrets documented in feature docs

## Safety rules

* Never publish mysql/redis ports in production
* Secrets only via server-side `.env.production`; never committed
* Rollback = redeploy previous image SHA tag
* UFW allows only 22/80/443
* MariaDB data survives redeploys (named volume; no `-v`)
* Keep dev `docker-compose.yml` untouched — both stacks can coexist on one machine

## Acceptance criteria

- [ ] `docker build` succeeds locally producing runnable image
- [ ] Prod stack boots locally: Caddy (HTTP while DOMAIN=localhost) → Laravel page 200
- [ ] Queue worker consumes jobs; scheduler process runs
- [ ] Mysql/redis unreachable from host (no published ports) but reachable from php container
- [ ] Workflow YAML valid; secrets list documented
- [ ] Docs cover VPS boot → DNS → verify HTTPS → rollback

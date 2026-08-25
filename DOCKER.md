# Docker Guide — HTUT AI Backend

Practical guide for running this project with Docker, locally and on a production server.
Deep-dive docs: `docs/features/docker-setup.md` (dev) · `docs/features/docker-production-setup.md` (prod).

```
LOCAL DEV                          PRODUCTION
docker-compose.yml                 docker-compose.production.yml
┌ php :8080 (serversideup) ┐       internet → Caddy :80/:443 (auto HTTPS)
├ mysql :3307→3306          ┤              │ reverse_proxy php:8080
├ redis :6380→6379          ┤       php · queue · scheduler
├ mailpit :8025 / :1025     ┤       mysql · redis  (no public ports)
└ node :5174 (Vite)         ┘       image from GHCR, built by GitHub Actions
```

---

## 1. Local development

### Start

```bash
make up          # = docker compose up -d
make ps          # wait until all show (healthy)
```

| URL | What |
|---|---|
| http://localhost:8080 | Laravel app |
| http://localhost:8025 | Mailpit (caught email) |
| http://localhost:5174 | Vite dev server |

First run only:

```bash
docker compose exec php composer install
make migrate
make wayfinder        # generate typed routes (node container has no PHP)
```

### Daily use

```bash
make logs             # tail all logs
make shell            # bash inside php
make migrate          # run migrations
make npm-install      # after changing package.json
make down             # stop — database survives (volumes kept)
```

**Rules**

- Never `docker compose down -v` — that erases the database (`htut-ai_mysql_data`).
- Your `.env` is used as-is on the host; containers get `DB_HOST=mysql`, `REDIS_HOST=redis`, `MAIL_HOST=mailpit` injected automatically.
- After changing routes/controllers while developing in Docker: `make wayfinder`.

---

## 2. Production server — start from scratch

Target: any Ubuntu VPS (e.g. DigitalOcean droplet), domain `ai.htut.com`.

### Step 1 — Prepare the server

```bash
ssh root@<SERVER_IP>

apt update && apt install -y docker.io docker-compose-v2 git ufw
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable
```

### Step 2 — Get the code

Add the server's SSH public key as a **read-only Deploy Key** in the GitHub repo
(Settings → Deploy keys), then:

```bash
mkdir -p /var/www && cd /var/www
git clone git@github.com:AI-Face-Swap/admin-dashboard.git htut-ai
cd htut-ai
```

### Step 3 — Configure secrets

```bash
cp .env.production.example .env.production
nano .env.production      # fill EVERY value: DB password, SEGMIND key, DO Spaces…
```

Generate the app key (the image has no `.env` file — set it as env var):

```bash
docker compose --env-file .env.production \
  -f docker-compose.production.yml run --rm php php artisan key:generate --show
nano .env.production      # paste output into APP_KEY=
```

While waiting for the domain, also set in `.env.production`:

```env
DOMAIN=<SERVER_IP>        # switch to ai.htut.com once DNS resolves
APP_URL=http://<SERVER_IP>
```

### Step 4 — First boot

```bash
cd /var/www/htut-ai

# Pull the image published by CI (see Step 5), or build locally:
docker build -t ghcr.io/ai-face-swap/admin-dashboard:latest .

make prod-up
make prod-ps      # every service should show Up (healthy)

curl http://127.0.0.1/healthcheck    # → OK
```

Migrations run automatically on start (`AUTORUN_ENABLED=true`).

> If GHCR pull is denied: create a GitHub PAT with `read:packages`,
> run `docker login ghcr.io` on the server once.

### Step 5 — Wire up CI/CD deploys

In GitHub → repo **Settings → Environments/Secrets**, add:

| Secret | Value |
|---|---|
| `SSH_HOST` | `<SERVER_IP>` |
| `SSH_USER` | `root` |
| `SSH_KEY` | private key authorized on the server |

After that, every push to `main` builds the image and deploys automatically.

### Step 6 — Domain & HTTPS

At the registrar for `htut.com`, add one DNS record:

```
Type A · Name: ai · Value: <SERVER_IP>
```

Then on the server:

```bash
nano .env.production      # DOMAIN=ai.htut.com and APP_URL=https://ai.htut.com

make prod-restart         # Caddy re-reads DOMAIN and requests the certificate
```

Caddy obtains the Let's Encrypt certificate automatically — no manual TLS work, ever.

---

## 3. Deploying updates

```bash
git push origin main      # automatic: build → GHCR → SSH deploy → migrate
```

Manual deploy from the server:

```bash
make prod-deploy          # pull latest image + recreate changed services
```

## 4. Rollback

Every build is tagged with its git short-SHA:

```bash
make prod-rollback SHA=<short-sha>
```

## 5. Day-2 operations

```bash
make prod-ps              # status & health
make prod-logs            # tail all logs (filter a service: make prod-logs s=php)
make prod-shell           # bash inside the app container (tinker, artisan…)
make prod-migrate         # run migrations manually (normally automatic)
make prod-down            # stop; volumes/database survive
```

Database backup:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec mysql mariadb-dump -uroot -p"$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)" \
  htut-ai > backup_$(date +%F).sql
```

## 6. Troubleshooting

| Symptom | Check |
|---|---|
| `ERROR: .env.production not found` | Copy `.env.production.example` and fill it in |
| Page 500 right after first boot | `APP_KEY` empty? → Step 3 of prod setup |
| Service unhealthy | `make prod-logs s=<service>` |
| Migration errors at boot | `make prod-logs s=php` — AUTORUN output shows the SQL error |
| Site unreachable / cert fails | DNS not propagated yet (`dig ai.htut.com`); Caddy retries automatically |
| Port 80/443 busy | `ss -tlnp \| grep -E ':(80\|443)'` — stop the other service |
| Disk filling up | `docker system df`; prune safely: `docker builder prune -f` |

**Never** run `docker compose down -v` in production — it deletes the database volume.

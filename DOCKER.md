# Docker Guide — HTUT AI Backend

Practical, step-by-step guide for running this project with Docker — locally for development and on a production server.

> **Goal of this document**: A developer with **one fresh Ubuntu VPS** can follow from zero and understand exactly: *"What do I install? Where does the code go? How does Docker get installed? How does the Laravel app become a Docker image? How do containers start? How does Nginx connect to Docker? How does the domain connect? How does HTTPS work? How does the database work? And how do I deploy future changes?"*

Deep-dive docs: `docs/features/docker-setup.md` (dev) · `docs/features/docker-production-setup.md` (prod).

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [Technology Stack](#2-technology-stack)
3. [Prerequisites](#3-prerequisites)
4. [Local Development](#4-local-development)
5. [Production Deployment From Zero](#5-production-deployment-from-zero)
6. [Server Preparation](#6-server-preparation)
7. [Firewall](#7-firewall)
8. [Project Deployment](#8-project-deployment)
9. [GitHub Deploy Key](#9-github-deploy-key)
10. [Production Environment Configuration](#10-production-environment-configuration)
11. [APP_KEY](#11-app_key)
12. [Docker Image — What Happens When You Build](#12-docker-image--what-happens-when-you-build)
13. [Build the Production Image](#13-build-the-production-image)
14. [Start the Production Docker Compose Stack](#14-start-the-production-docker-compose-stack)
15. [Containers Explained](#15-containers-explained)
16. [Same Image, Different Containers](#16-same-image-different-containers)
17. [Database and Volumes](#17-database-and-volumes)
18. [Migrations](#18-migrations)
19. [Health Check](#19-health-check)
20. [How One Browser Request Reaches Laravel](#20-how-one-browser-request-reaches-laravel)
21. [Domain / DNS](#21-domain--dns)
22. [Host Nginx](#22-host-nginx)
23. [HTTPS / Certbot](#23-https--certbot)
24. [Final Verification — Application Is Live](#24-final-verification--application-is-live)
25. [First Deployment vs Future Deployment](#25-first-deployment-vs-future-deployment)
26. [CI/CD Pipeline](#26-cicd-pipeline)
27. [Rollback](#27-rollback)
28. [Day-2 Operations](#28-day-2-operations)
29. [Database Backup](#29-database-backup)
30. [Troubleshooting](#30-troubleshooting)
31. [Production Safety Rules](#31-production-safety-rules)
32. [Quick Reference](#32-quick-reference)

---

## 1. What We Are Building

### Production Architecture

```text
                    INTERNET
                       │
                       │ https://ai.htut.com
                       ▼
              ┌──────────────────┐
              │   Ubuntu VPS     │
              │                  │
              │ Host Nginx       │
              │ :80 / :443       │
              └────────┬─────────┘
                       │
                       │ 127.0.0.1:8080
                       ▼
              ┌──────────────────┐
              │ Docker           │
              │                  │
              │ Laravel/PHP      │
              │ Nginx + PHP-FPM  │
              └────────┬─────────┘
                       │
             Docker internal network
                 ┌─────┴─────┐
                 ▼           ▼
            ┌─────────┐  ┌─────────┐
            │ MariaDB │  │  Redis  │
            │  :3306  │  │  :6379  │
            └─────────┘  └─────────┘

                 ┌───────────────┐
                 │ Queue Worker  │
                 │ Scheduler     │
                 └───────────────┘
```

### What This Diagram Means

**Physical Server (VPS)** — An Ubuntu virtual private server rented from a provider like DigitalOcean, AWS EC2, Vultr, or Linode. You SSH in and run commands on it.

**Docker Engine** — Software installed on the VPS that runs containers. Without it, nothing Docker-related works.

**Container** — An isolated environment. Our Laravel application runs inside a container so it doesn't interfere with the server's system files. Stopping/deleting the container stops the app but leaves the server untouched.

**Laravel/PHP Container** — Runs our Laravel application on top of `serversideup/php:8.4-fpm-nginx`. Both Nginx and PHP-FPM live inside this container. It listens on port 8080.

**MariaDB Container** — The database server. MySQL-compatible, runs inside a container. Port 3306 is only accessible via Docker's internal network — not exposed publicly.

**Redis Container** — In-memory store for caching, queues, and sessions. Same as MariaDB — only accessible via Docker's internal network.

**Host Nginx** — Runs on the VPS at the host level. Listens on ports 80 (HTTP) and 443 (HTTPS). Receives user requests and forwards them to the Laravel container at `127.0.0.1:8080`. This is called a **reverse proxy**.

**Why port 8080 is not publicly exposed** — We publish port 8080 on `127.0.0.1` (localhost only). External traffic cannot reach it directly. Only the host Nginx forwards HTTPS traffic to it. This is a security best practice.

### How a Browser Request Travels

```text
User types "https://ai.htut.com" in browser
    ↓
DNS server resolves domain → server IP address
    ↓
Request reaches server's public IP
    ↓
Host Nginx (:443) accepts the request
    ↓
Host Nginx proxies to 127.0.0.1:8080
    ↓
Docker PHP container receives the request
    ↓
Laravel processes the request
    ↓
Laravel talks to MariaDB / Redis
    ↓
Response travels back to browser
```

---

## 2. Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| PHP | 8.4 | Laravel backend runtime |
| Laravel | 13 | PHP framework (Fortify, Passkeys, 2FA) |
| MariaDB | 11 | Database (MySQL compatible) |
| Redis | 7 | Cache, queue, session |
| Node.js | 20 | Frontend asset build (Vite) |
| serversideup/php | 8.4-fpm-nginx | Docker base image (Nginx + PHP-FPM) |
| DigitalOcean Spaces | S3 compatible | File/image storage |
| Segmind | AI API | Image generation, face swap, video face-swap |
| Vite | — | Frontend build tool (React + TypeScript + Tailwind CSS) |
| Inertia v3 | React 19 | Admin dashboard frontend |

---

## 3. Prerequisites

To follow this guide you need:

- **An Ubuntu VPS** — DigitalOcean droplet, AWS EC2, Vultr, Linode, etc.
- **A domain name** — e.g. `ai.htut.com`
- **SSH access** — root user login via SSH
- **GitHub account** — access to the project repository
- **DNS management access** — ability to edit DNS records for your domain

---

## 4. Local Development

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

### First Run Only

```bash
docker compose exec php composer install
make migrate
make wayfinder        # generate typed routes (node container has no PHP)
```

### Daily Use

```bash
make logs             # tail all logs
make shell            # bash inside php
make migrate          # run migrations
make npm-install      # after changing package.json
make down             # stop — database survives (volumes kept)
```

### Rules

- **Never** `docker compose down -v` — that erases the database (`htut-ai_mysql_data`).
- Your `.env` is used as-is on the host; containers get `DB_HOST=mysql`, `REDIS_HOST=redis`, `MAIL_HOST=mailpit` injected automatically.
- After changing routes/controllers while developing in Docker: `make wayfinder`.

### Local Development vs Production Architecture

| Aspect | Local Dev (`docker-compose.yml`) | Production (`docker-compose.production.yml`) |
|---|---|---|
| **PHP Service** | `image: serversideup/php:8.4-fpm-nginx` (base image) | `image: ghcr.io/ai-face-swap/admin-dashboard:${IMAGE_TAG}` (custom built) |
| **Code Mount** | Bind mount: `.:/var/www/html` (live reload) | **No bind mount** — code baked into image |
| **Frontend** | Separate `node` container: `npm run dev` (HMR) | **Pre-built assets** in image (`public/build`) |
| **Dependencies** | `composer install` inside container at runtime | **Pre-installed** in image (Stage 1) |
| **Wayfinder** | `make wayfinder` manual run | **Pre-generated** in image (Stage 1) |
| **Config** | Host `.env` + auto-injected env vars | `.env.production` via `env_file` |

---

## 5. Production Deployment From Zero

This section walks through deploying to a completely fresh server.

### Assumptions

```text
Ubuntu VPS
Public IP: SERVER_IP
Domain: ai.htut.com
```

### The Full Deployment Flow

```text
Fresh Ubuntu VPS
      ↓
SSH into server
      ↓
Install Docker / Compose / Nginx / Git / UFW
      ↓
Configure firewall
      ↓
Clone project
      ↓
Create .env.production
      ↓
Configure secrets
      ↓
Generate APP_KEY
      ↓
Build Docker image
      ↓
Start Docker Compose production stack
      ↓
Laravel container starts
      ↓
MariaDB container starts
      ↓
Redis container starts
      ↓
Queue container starts
      ↓
Scheduler container starts
      ↓
Verify migrations
      ↓
Health check
      ↓
Configure host Nginx
      ↓
Point DNS to server
      ↓
Configure HTTPS with Certbot
      ↓
Application is live
```

---

## 6. Server Preparation

SSH into your fresh server:

```bash
ssh root@SERVER_IP
```

### Install Required Packages

```bash
apt update
apt install -y \
    docker.io \
    docker-compose-v2 \
    git \
    nginx \
    ufw
```

**What each package is for:**

| Package | Purpose |
|---|---|
| `docker.io` | Docker Engine — runs containers |
| `docker-compose-v2` | Docker Compose — manages multi-container apps |
| `git` | Clones the project code onto the server |
| `nginx` | Host-level reverse proxy — HTTPS termination and traffic forwarding |
| `ufw` | Firewall — controls which ports are accessible |

### Verify Installation

```bash
docker --version
docker compose version
git --version
nginx -v
```

Each command should print a version number. If any fails, re-run the `apt install` command.

---

## 7. Firewall

The firewall controls which ports are open to the outside world.

### UFW Configuration

```bash
# SSH — required for remote access
ufw allow OpenSSH

# HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable the firewall
ufw enable

# Verify
ufw status
```

### Why These Ports Are NOT Exposed

| Port | Service | Why not public |
|---|---|---|
| 3306 | MariaDB | Database — only accessible via Docker's internal network |
| 6379 | Redis | Cache/Queue — only accessible via Docker's internal network |
| 8080 | Laravel App | Only localhost — host Nginx proxies to it internally |

MariaDB and Redis communicate through Docker's internal network. Exposing them publicly is a security risk.

---

## 8. Project Deployment

### Create the Deployment Directory

We use `/var/www/htut-ai` because `/var/www/` is the standard location for web applications on Linux servers.

```bash
mkdir -p /var/www
cd /var/www
```

### Clone the Project

```bash
git clone git@github.com:AI-Face-Swap/admin-dashboard.git htut-ai
cd /var/www/htut-ai
```

### Filesystem After Cloning

```text
/var/www/
  └── htut-ai/                    ← project root
      ├── Dockerfile
      ├── docker-compose.production.yml
      ├── Makefile
      ├── .env.production.example
      ├── deploy/
      │   └── nginx-ai.htut.com.conf.example
      ├── app/
      ├── config/
      ├── database/
      ├── resources/
      ├── routes/
      ├── composer.json
      ├── composer.lock
      ├── package.json
      ├── package-lock.json
      └── ...
```

---

## 9. GitHub Deploy Key

The production server needs read-only access to the private GitHub repository. A **deploy key** provides this.

```text
GitHub Repository
        ↑
        │ SSH (read-only access)
        │
Production Server
```

### Step 1: Get the Server's SSH Public Key

On the server:

```bash
cat ~/.ssh/id_rsa.pub
```

If no key exists, generate one:

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### Step 2: Add as Deploy Key on GitHub

1. Go to `https://github.com/AI-Face-Swap/admin-dashboard/settings/keys`
2. Click **"Add deploy key"**
3. **Title**: `htut-ai-production-server`
4. **Key**: Paste the server's public key
5. Check **"Allow read-only access"** (write access is not needed)
6. Click **"Add key"**

The server can now `git pull` code but cannot `git push`. This is a security best practice.

---

## 10. Production Environment Configuration

### What is `.env.production`

Application secrets (database passwords, API keys, etc.) are stored in environment variables, not in the Docker image.

### Why `.env.production` Lives on the Host

```text
Host (server):
.env.production     ← edited on the server
       │
       │ environment injection (docker compose env_file)
       ▼
Docker container:
Laravel receives APP_KEY, DB_*, REDIS_*, etc.
```

The `.env.production` file is **not baked into the Docker image**. It lives on the host server only. Docker Compose injects its values into containers at startup.

### Create `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

### Key Variables to Configure

```env
# ── Application ──
APP_NAME="HTUT AI"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://ai.htut.com
APP_PORT=8080

# ── Database (MariaDB) ──
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=htut-ai
DB_USERNAME=htut-ai
DB_PASSWORD=<strong-password-here>

# ── Redis ──
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password-here>

# ── Mail ──
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@htut.com"
MAIL_FROM_NAME="HTUT AI"

# ── API Keys ──
SEGMIND_API_KEY=<your-segmind-key>

# ── DigitalOcean Spaces ──
DO_SPACES_KEY=<spaces-access-key>
DO_SPACES_SECRET=<spaces-secret>
DO_SPACES_REGION=sgp1
DO_SPACES_BUCKET=imagesbucket
DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com

# ── Sanctum (Session Auth) ──
SANCTUM_STATEFUL_DOMAINS=ai.htut.com
SESSION_DOMAIN=.htut.com
```

### Why `DB_HOST=mysql` Is Correct Inside Docker

```text
✅ DB_HOST=mysql     ← Inside Docker: "mysql" is the Docker service name
❌ DB_HOST=localhost  ← Inside Docker: WRONG — localhost means the container itself
```

Docker Compose creates a network where containers find each other by service name. `mysql` resolves to the MariaDB container's IP automatically.

---

## 11. APP_KEY

### Why APP_KEY Is Required

Laravel uses APP_KEY for encryption, session handling, and token generation. Without it, the application returns a 500 error.

### Generate APP_KEY (Correct Method)

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  run --rm php php artisan key:generate --show
```

**Why this command works:**
- `--env-file .env.production` — injects environment variables into the container
- `-f docker-compose.production.yml` — uses the production compose file
- `run --rm` — runs a temporary container and removes it after
- `php artisan key:generate --show` — generates a key and prints it to the terminal

### Paste the Key into `.env.production`

```bash
nano .env.production
# Find the APP_KEY= line and paste the output
```

```env
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ⚠️ Why `php artisan key:generate` Without `--show` Fails

```text
❌  docker compose exec php php artisan key:generate

Why it fails:
- The image has NO .env file (by design)
- artisan looks for /var/www/html/.env
- File not found → error
- Use key:generate --show to print the key to terminal,
  then paste it into .env.production on the host
```

If port 8080 is already taken on the server, use a different port:

```env
APP_PORT=8088             # optional — default is 8080
```

---

## 12. Docker Image — What Happens When You Build

Only after understanding the deployment steps, here's what happens when you build:

```bash
docker build -t ghcr.io/ai-face-swap/admin-dashboard:latest .
```

### Three-Stage Build Process

```text
Source Code (Laravel + React + TypeScript)
    ↓
Dockerfile (3 stages)
    ↓
Stage 1: PHP vendor + Wayfinder types
  - composer install --no-dev
  - php artisan wayfinder:generate --with-form
    ↓
Stage 2: Frontend assets (Node + Vite)
  - npm ci
  - npm run build
  - Vite → public/build/
    ↓
Stage 3: Final production image
  - serversideup/php:8.4-fpm-nginx base
  - Laravel source + vendor (from Stage 1) + assets (from Stage 2)
```

### Stage 1 — PHP Dependencies + Wayfinder

```dockerfile
FROM serversideup/php:8.4-fpm-nginx AS vendor
WORKDIR /var/www/html
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction --no-progress
COPY --chown=www-data:www-data . .
RUN composer dump-autoload --optimize && php artisan wayfinder:generate --with-form
```

- `composer install --no-dev` — Production dependencies only (no test tools)
- `--optimize-autoloader` — Faster class loading via class map generation
- `wayfinder:generate --with-form` — Generates TypeScript typed routes. Must happen in Stage 1 because Node container has no PHP.

### Stage 2 — Frontend Assets

```dockerfile
FROM node:20-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY node_modules/.cache/laravel-vite-plugin ./node_modules/.cache/laravel-vite-plugin
COPY . .
COPY --from=vendor /var/www/html/resources/js/actions resources/js/actions
COPY --from=vendor /var/www/html/resources/js/routes resources/js/routes
COPY --from=vendor /var/www/html/resources/js/wayfinder resources/js/wayfinder
ENV VITE_WAYFINDER_COMMAND=true
RUN npm run build
```

- `npm ci` — Exact dependencies from lock file
- Font cache (committed to git) — Hermetic builds: no network calls to `fonts.bunny.net` at build time
- `COPY --from=vendor` — Takes Wayfinder files generated in Stage 1
- `npm run build` — Vite compiles JS/CSS → `public/build/`

### Stage 3 — Final Production Image

```dockerfile
FROM serversideup/php:8.4-fpm-nginx
WORKDIR /var/www/html
COPY --chown=www-data:www-data . .
RUN rm -f bootstrap/cache/packages.php bootstrap/cache/services.php
COPY --from=vendor --chown=www-data:www-data /var/www/html/vendor ./vendor
COPY --from=assets --chown=www-data:www-data /app/public/build ./public/build
```

- Copies Laravel source code
- Removes dev cache manifests
- Takes `vendor/` from Stage 1
- Takes `public/build/` from Stage 2

### Image Size Comparison

```text
Single-stage (naive):   ~1.5 GB+
  - Node + PHP + vendor + dev deps + source

Multi-stage (actual):  ~250 MB
  - Only Stage 3 (final) becomes the output image
  - Stage 1 and Stage 2 are discarded after build
```

---

## 13. Build the Production Image

### Build Command

```bash
docker build -t ghcr.io/ai-face-swap/admin-dashboard:latest .
```

**What this does:** Compiles and packages the source code into a Docker image, tagged as `ghcr.io/ai-face-swap/admin-dashboard:latest`.

### Verify the Image Was Built

```bash
docker images
```

You should see `ghcr.io/ai-face-swap/admin-dashboard` with the `latest` tag. Size should be approximately 250MB.

### Optional: Inspect Image Contents

```bash
docker run --rm ghcr.io/ai-face-swap/admin-dashboard:latest ls -la /var/www/html/public/build
```

You should see Vite build output files (JS, CSS).

### What Is Baked Into the Image

```text
✅ Baked into the image:
  - Laravel source code
  - vendor/ (PHP dependencies — no-dev, optimized)
  - public/build/ (compiled Vite assets)
  - Wayfinder typed routes (resources/js/actions, routes, wayfinder)
  - PHP 8.4 runtime
  - Nginx (serversideup image built-in)
  - Composer autoloader (optimized)

❌ NOT in the image:
  - .env.production (lives on the host only)
  - Database data (MariaDB container)
  - Redis data (Redis container)
  - Runtime secrets (injected via environment variables)
```

> If GHCR pull is denied on future deploys: create a GitHub PAT with `read:packages`, run `docker login ghcr.io` on the server once.

---

## 14. Start the Production Docker Compose Stack

### Start

```bash
cd /var/www/htut-ai
make prod-up
```

### Verify

```bash
make prod-ps
```

All services should show `Up (healthy)`:

```text
Docker Compose Production Stack
      │
      ├── php          (web application — Nginx + PHP-FPM)
      ├── queue        (background job worker)
      ├── scheduler    (cron/scheduled task runner)
      ├── mysql        (MariaDB database)
      └── redis        (cache + queue backend)
```

### Health Check

```bash
curl http://127.0.0.1:8080/healthcheck    # → OK
```

Migrations run automatically on start (`AUTORUN_ENABLED=true`).

---

## 15. Containers Explained

| Container | Run Command | Purpose |
|---|---|---|
| `php` | Default (Nginx + PHP-FPM) | Handles HTTP requests via Laravel. Listens on port 8080. |
| `queue` | `php artisan queue:work --tries=3 --timeout=600` | Processes background jobs (video face-swap, image processing, etc.) |
| `scheduler` | `php artisan schedule:work` | Runs cron jobs (cleanup commands, scheduled tasks) |
| `mysql` | MariaDB 11 | Database server — stores application data |
| `redis` | `redis-server --appendonly yes` | Cache, queue backend, session storage |

---

## 16. Same Image, Different Containers

Three containers use the **same Docker image** but run **different commands**:

```text
php container:
  → Default entrypoint (Nginx + PHP-FPM)
  → Serves HTTP requests

queue container:
  → php artisan queue:work --tries=3 --timeout=600
  → Processes background jobs

scheduler container:
  → php artisan schedule:work
  → Runs cron/scheduled tasks
```

**Why this architecture is useful:**

1. **Identical codebase** — All three containers run the exact same application code
2. **Single build** — Only one image needs to be built
3. **Easy rollback** — Changing one image tag updates all three containers
4. **Separate concerns** — Web request processing and background job processing are isolated; if one fails, the others keep running

---

## 17. Database and Volumes

### Where MariaDB's Data Lives

```text
MariaDB container
      │
      ▼
Docker volume: mysql_data
      │
      ▼
Database data (tables, records) survives container recreation

Redis container
      │
      ▼
Docker volume: redis_data
      │
      ▼
Cache + queue data survives container recreation

PHP container
      │
      ▼
Docker volume: php_logs
      │
      ▼
Laravel log files survive container recreation
```

### `docker compose down` vs `docker compose down -v`

```bash
# ✅ SAFE — stops containers, volumes/database survive
make prod-down

# ❌ DESTRUCTIVE — stops containers AND deletes all data volumes
docker compose down -v
```

> ⚠️ **NEVER run `docker compose down -v` in production** — it deletes the `mysql_data` volume and all your database data.

---

## 18. Migrations

### Automatic Migrations (On Container Start)

This project has `AUTORUN_ENABLED=true` set. When containers start, migrations run automatically:

```text
Container starts
    ↓
serversideup image checks AUTORUN_ENABLED=true
    ↓
php artisan migrate --force runs
    ↓
Database schema is updated
```

### Manual Migration

```bash
make prod-migrate
```

**When to use manually:**
- AUTORUN migration failed
- You want to force re-run migrations
- Migration error appears in container logs

### Build Time vs Runtime

```text
Image Build (docker build):
  ✅ composer install
  ✅ npm run build
  ✅ wayfinder:generate
  ❌ php artisan migrate (not run at build time)

Application Startup (docker compose up):
  ❌ composer install (vendor already in image)
  ❌ npm run build (assets already in image)
  ✅ php artisan migrate (AUTORUN_ENABLED=true)
  ✅ config:cache, route:cache, view:cache (serversideup image handles this)
```

---

## 19. Health Check

### Test the Application

```bash
curl http://127.0.0.1:8080/healthcheck
```

**Why this test is done BEFORE configuring DNS and HTTPS:**
- Verifies the container is running correctly
- Verifies Laravel is responding
- Verifies Nginx inside the container is listening on port 8080
- Verifies database connection is working

**Expected result:** `OK` or a JSON response.

### If Health Check Fails

**Stop here. Do not configure DNS or HTTPS yet.** Troubleshoot Docker first:

```bash
make prod-ps              # container status
make prod-logs s=php      # PHP container logs
make prod-logs s=mysql    # MySQL container logs
make prod-logs s=redis    # Redis container logs
make prod-logs s=queue    # Queue container logs
```

---

## 20. How One Browser Request Reaches Laravel

```text
User browser types URL
   ↓
DNS Server resolves domain → IP address
   ↓
Request reaches Server Public IP
   ↓
Host Nginx (:443 HTTPS) accepts request
   ↓
Host Nginx proxies to 127.0.0.1:8080
   ↓
Docker PHP Container (port 8080) receives request
   ↓
Nginx (container internal) → PHP-FPM → Laravel
   ↓
Laravel Router → Controller → Service
   ↓
Laravel talks to MariaDB container
Laravel talks to Redis container
   ↓
Response built
   ↓
Response: Container → Host Nginx → Browser
```

### Hop-by-Hop

1. **Browser → DNS**: Browser asks DNS server for `ai.htut.com`'s IP address
2. **DNS → Server IP**: DNS returns the server's public IP (e.g. `123.45.67.89`)
3. **Request → Server (Port 443)**: Browser opens TCP connection to server port 443. SSL/TLS handshake creates encrypted connection.
4. **Host Nginx (Port 443)**: Host Nginx accepts the HTTPS request. Matches `server_name ai.htut.com` config.
5. **Nginx → 127.0.0.1:8080**: Host Nginx follows `proxy_pass http://127.0.0.1:8080` and forwards the request to the Docker PHP container.
6. **Container → Laravel**: Container's internal Nginx passes to PHP-FPM, which boots/runs the Laravel application.
7. **Laravel → Database/Redis**: Laravel connects to MariaDB via `DB_HOST=mysql` (Docker network) and Redis via `REDIS_HOST=redis`.

---

## 21. Domain / DNS

### Create DNS Record

In your domain registrar's DNS management panel:

```text
Type:   A
Name:   ai
Value:  SERVER_IP (e.g. 123.45.67.89)
TTL:    3600 (or default)
```

**Why A record:** An A record maps a domain name to an IPv4 address. Typing `ai.htut.com` will resolve to your server's IP.

### Verify DNS Propagation

```bash
dig ai.htut.com
# or
nslookup ai.htut.com
```

**Expected result:** Your server's public IP address.

> DNS propagation takes time (minutes to hours). Don't run Certbot until DNS is propagated.

---

## 22. Host Nginx

### Why Host Nginx Exists

```text
Internet traffic (port 80/443)
         ↓
Host Nginx (port 80/443)
         ↓
Docker container (port 8080 — localhost only)
```

Host Nginx provides:
1. **HTTPS termination** — SSL certificate is managed at the host level
2. **Traffic forwarding** — Proxies requests to the Docker container
3. **Multiple sites** — Host Nginx can serve other projects too
4. **Security** — Port 8080 stays internal, not publicly exposed

### Install Nginx Config

```bash
# Copy the config template
cp deploy/nginx-ai.htut.com.conf.example /etc/nginx/sites-available/htut-ai

# Enable the site
ln -s /etc/nginx/sites-available/htut-ai /etc/nginx/sites-enabled/htut-ai

# Test the config
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Understanding the Config

```nginx
server {
    listen 80;                    # Listen on HTTP port
    listen [::]:80;               # Also for IPv6
    server_name ai.htut.com;      # Only for this domain

    client_max_body_size 100M;    # Upload size limit

    location / {
        proxy_pass http://127.0.0.1:8080;  # Forward to Docker container
        proxy_http_version 1.1;

        # Headers — pass real client info to Laravel
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "";

        # Long-running requests (video face-swap)
        proxy_read_timeout    600s;
        proxy_send_timeout    600s;
        proxy_request_buffering off;
    }
}
```

### Key Concepts

**`sites-available` vs `sites-enabled`:**
- `sites-available/` — Where Nginx config files are stored
- `sites-enabled/` — Contains symlinks to active configs. To disable a site, remove its symlink from `sites-enabled/` and reload Nginx.

**`proxy_pass`:**
- Host Nginx forwards requests to `127.0.0.1:8080`
- `127.0.0.1` = localhost (the server itself)
- Port 8080 = the Docker PHP container

---

## 23. HTTPS / Certbot

### Issue SSL Certificate

```bash
certbot --nginx -d ai.htut.com
```

**What this does:**
1. Obtains a free SSL certificate from Let's Encrypt
2. Adds an HTTPS (port 443) block to the Nginx config
3. Sets up HTTP → HTTPS auto-redirect
4. Configures automatic certificate renewal

### How HTTPS Works

```text
HTTP request (port 80)
    ↓
Nginx redirects to HTTPS
    ↓
HTTPS request (port 443)
    ↓
Let's Encrypt certificate handles encryption/decryption
    ↓
Proxied to 127.0.0.1:8080
    ↓
Docker PHP container → Laravel
```

### Update APP_URL

After HTTPS is live, update `.env.production`:

```env
APP_URL=https://ai.htut.com
```

**Why this matters:**
- Laravel uses `APP_URL` for URL generation
- Secure cookies, CSRF tokens, and redirect URLs all depend on `APP_URL`
- Keeping `http://` causes redirect loops

### Proxy Handling

Laravel already has trusted proxy configuration (`trustProxies` in `bootstrap/app.php`). HTTPS URLs, secure cookies, and client IP detection work out of the box.

---

## 24. Final Verification — Application Is Live

### Step 1: Container Status

```bash
make prod-ps
```

All containers should show `Up (healthy)`.

### Step 2: Health Check

```bash
curl http://127.0.0.1:8080/healthcheck
```

Should return `OK` or a success JSON response.

### Step 3: Nginx Status

```bash
systemctl status nginx
nginx -t
```

Nginx should be `active (running)` and config test should show `successful`.

### Step 4: Browser Test

Open `https://ai.htut.com` in your browser.

**Successful deployment signs:**
- ✅ `make prod-ps` → all healthy
- ✅ `curl healthcheck` → OK
- ✅ `https://ai.htut.com` → loads correctly
- ✅ HTTPS lock icon visible
- ✅ HTTP auto-redirects to HTTPS

---

## 25. First Deployment vs Future Deployment

This distinction is critical:

### First Deployment (One-time server setup)

```text
New Server
    ↓
SSH login
    ↓
Install Docker / Compose / Nginx / Git / UFW
    ↓
Configure firewall
    ↓
Clone project
    ↓
Create .env.production
    ↓
Generate APP_KEY
    ↓
Build Docker image (docker build)
    ↓
Start Docker Compose production stack (make prod-up)
    ↓
Verify health check
    ↓
Configure host Nginx
    ↓
Point DNS to server
    ↓
Configure HTTPS with Certbot
    ↓
Application is LIVE
```

**This is what sections 5–24 covered** — setting up the application from scratch on a fresh server.

### Future Deployment (Ongoing updates)

```text
Developer
    ↓
git push origin main
    ↓
GitHub Actions: Docker build → GHCR push
    ↓
GitHub Actions: SSH to server → pull image → recreate containers
    ↓
AUTORUN: php artisan migrate
    ↓
New version LIVE
```

After the first deployment, you never need to build images or configure Nginx again. Just `git push`.

---

## 26. CI/CD Pipeline

CI/CD automates deployment: push code → image builds → server deploys.

### Pipeline Flow

```text
Developer: git push origin main
    ↓
GitHub Actions: Build Multi-Stage Docker Image
    ↓
Push to GHCR:
  ghcr.io/ai-face-swap/admin-dashboard:<short-sha>
  ghcr.io/ai-face-swap/admin-dashboard:latest
    ↓
GitHub Actions: SSH to production server
    ↓
Server: git pull --ff-only
    ↓
Server: docker compose pull (new image)
    ↓
Server: docker compose up -d --remove-orphans (recreate containers)
    ↓
Server: docker image prune -f (cleanup old images)
    ↓
AUTORUN: php artisan migrate (if new migrations)
    ↓
New version LIVE
```

### Image Tags

| Tag | Purpose |
|---|---|
| `latest` | Points to the most recent main branch build |
| `<short-sha>` | Immutable tag (e.g. `ghcr.io/.../admin-dashboard:a1b2c3d`) — used for rollback |

**Why SHA tags are useful:**
- `latest` gets overwritten — you can't tell which version is running
- SHA tags map to a specific commit — you can roll back to an exact version

### GitHub Secrets Setup

Go to GitHub → Repository → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SSH_HOST` | `<SERVER_IP>` |
| `SSH_USER` | `root` |
| `SSH_KEY` | Private key authorized on the server |

After this, every push to `main` builds and deploys automatically.

---

## 27. Rollback

### When You Need Rollback

```text
Version A (working) → Version B (has bug)
                              ↓
                    Rollback to Version A
```

### Rollback Command

```bash
# See available images
docker images ghcr.io/ai-face-swap/admin-dashboard

# Roll back to a specific version
make prod-rollback SHA=<short-sha>
```

### What Happens Internally

```text
1. IMAGE_TAG=<sha> is set as environment variable
2. docker compose up -d --remove-orphans runs
3. Containers are recreated with the old image
4. AUTORUN: php artisan migrate (safe — down migrations don't auto-run)
```

---

## 28. Day-2 Operations

### Status Check

```bash
make prod-ps
```

**When to use:** Checking if containers are healthy.

### Logs

```bash
make prod-logs              # tail all logs
make prod-logs s=php        # PHP container logs only
make prod-logs s=mysql      # MySQL container logs only
make prod-logs s=queue      # Queue container logs only
make prod-logs s=scheduler  # Scheduler container logs only
```

**When to use:** Finding errors, debugging requests, checking migration output.

### Shell Access

```bash
make prod-shell
```

**When to use:** Running Laravel Tinker, artisan commands, inspecting files.

### Manual Migration

```bash
make prod-migrate
```

**When to use:** AUTORUN migration failed, or you added a new migration file.

### Stop (Database Safe)

```bash
make prod-down
```

**Why safe:** Stops containers only. Database volume survives.

### Start Again

```bash
make prod-up
```

---

## 29. Database Backup

### Backup Command

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec mysql mariadb-dump -uroot -p"$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)" \
  htut-ai > backup_$(date +%F).sql
```

**What this does:**
1. Enters the MariaDB container
2. Runs `mariadb-dump` for database `htut-ai`
3. Saves output to a timestamped SQL file (e.g. `backup_2024-01-15.sql`)

### Restore from Backup

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec -T mysql mariadb -uroot -p"$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)" \
  htut-ai < backup_2024-01-15.sql
```

---

## 30. Troubleshooting

### Server Problems

#### SSH Connection Refused

```text
Symptom: Cannot SSH into server
Cause:   Firewall blocking port 22, or SSH key issue
Check:   Use VPS provider console to login, run ufw status
Fix:     ufw allow OpenSSH && ufw enable
```

#### Disk Space Full

```text
Symptom: Containers won't start, "no space left on device"
Cause:   Docker images/cache accumulation
Check:   docker system df
Fix:     docker builder prune -f
```

### Docker Problems

#### Container Won't Start

```text
Symptom: make prod-ps shows "Exit" or "Restarting"
Cause:   Config error, missing env var, port conflict
Check:   make prod-logs s=<container-name>
Fix:     Read error message → fix → make prod-restart
```

#### Image Build Failure

```text
Symptom: docker build error
Cause:   Network issue (npm/composer), syntax error in Dockerfile
Check:   Read docker build output error message
Fix:     Check network, review Dockerfile
```

#### Container Unhealthy

```text
Symptom: make prod-ps shows "Unhealthy"
Cause:   Health check endpoint failing, application error
Check:   curl http://127.0.0.1:8080/healthcheck
Fix:     make prod-logs s=php → read error log → fix
```

### Laravel Problems

#### APP_KEY Empty

```text
Symptom: Page 500, "Unsupported cipher or incorrect key length"
Cause:   APP_KEY missing
Check:   grep APP_KEY .env.production
Fix:     docker compose --env-file .env.production \
           -f docker-compose.production.yml run --rm php \
           php artisan key:generate --show
         → paste into .env.production → make prod-restart
```

#### Database Connection Error

```text
Symptom: "SQLSTATE[HY000] [2002] Connection refused"
Cause:   DB_HOST wrong, MySQL container not running yet
Check:   make prod-ps → check mysql container status
Fix:     DB_HOST=mysql (not localhost), wait for mysql healthy
```

#### Migration Error at Boot

```text
Symptom: Migration error on container start
Cause:   SQL syntax error, column already exists, etc.
Check:   make prod-logs s=php → read AUTORUN output
Fix:     make prod-shell → php artisan migrate (manual inspection)
```

### Nginx Problems

#### 502 Bad Gateway

```text
Symptom: Browser shows "502 Bad Gateway"
Cause:   App container down, port 8080 not listening
Check:   curl http://127.0.0.1:8080/healthcheck
         make prod-ps → check php container
Fix:     make prod-up → restart containers
```

#### 504 Gateway Timeout

```text
Symptom: Browser shows "504 Gateway Timeout"
Cause:   Request taking too long (e.g. video face-swap)
Check:   make prod-logs s=php
Fix:     Increase proxy_read_timeout, optimize application
```

#### Nginx Config Error

```text
Symptom: nginx -t shows "test failed"
Cause:   Syntax error in config file
Check:   nginx -t → read error message
Fix:     Edit config file → nginx -t → systemctl reload nginx
```

### DNS / HTTPS Problems

#### DNS Not Resolving

```text
Symptom: Browser shows "server not found"
Cause:   DNS record not added, propagation incomplete
Check:   dig ai.htut.com
Fix:     Add A record → wait for propagation
```

#### Certificate Failure

```text
Symptom: certbot cannot obtain certificate
Cause:   DNS not propagated, port 80 blocked
Check:   dig ai.htut.com, ufw status
Fix:     Wait for DNS propagation → certbot --nginx -d ai.htut.com
```

#### HTTPS Redirect Loop

```text
Symptom: Browser shows "too many redirects"
Cause:   APP_URL still http://, TrustProxy misconfigured
Check:   grep APP_URL .env.production
Fix:     Set APP_URL=https://ai.htut.com
```

### Other Issues

#### Port 8080 Busy

```text
Symptom: Container can't bind to port 8080
Cause:   Another service using the port
Check:   ss -tlnp | grep 8080
Fix:     Set APP_PORT=<free port> in .env.production, update nginx proxy_pass
```

#### `laravel.log` Growing Large

```text
Symptom: Disk filling up with logs
Cause:   No log rotation configured
Check:   ls -lh storage/logs/laravel.log
Fix:     make prod-shell → : > storage/logs/laravel.log
```

---

## 31. Production Safety Rules

### ⚠️ Never Do These

| Rule | Why |
|---|---|
| `docker compose down -v` | Deletes database volume — all data lost |
| Plain `php artisan key:generate` (inside container) | Image has no `.env` — will error |
| `composer install` (in production container) | vendor/ already in image — redundant |
| `npm run build` (in production container) | Assets already in image — redundant |
| Objects/closures in config files | `php artisan optimize` can't serialize them — container fails |

### ✅ Always Do These

| Rule | Why |
|---|---|
| Keep `.env.production` on the host only | Security — secrets never in image |
| Generate APP_KEY and paste into `.env.production` | Required for Laravel encryption |
| Use `make prod-down` only | Database volume survives |
| Regular DB backups | Prevents data loss |
| Run `docker builder prune -f` periodically | Reclaims disk space |

---

## 32. Quick Reference

### Local Development Commands

| Command | Description |
|---|---|
| `make up` | Start all services |
| `make down` | Stop all services (database survives) |
| `make ps` | Show service status and health |
| `make logs` | Tail all logs |
| `make logs s=php` | Tail PHP logs only |
| `make shell` | Bash into PHP container |
| `make migrate` | Run migrations |
| `make wayfinder` | Regenerate typed routes |
| `make npm-install` | Install/update frontend dependencies |

### Production Commands

| Command | Description |
|---|---|
| `make prod-up` | Start production stack |
| `make prod-down` | Stop production stack (database survives) |
| `make prod-ps` | Show production status & health |
| `make prod-logs` | Tail production logs |
| `make prod-logs s=php` | Tail PHP logs only |
| `make prod-shell` | Bash into production PHP container |
| `make prod-migrate` | Run migrations manually |
| `make prod-deploy` | Pull latest image + recreate |
| `make prod-rollback SHA=<sha>` | Rollback to specific version |

### Key Files

| File | Location | Purpose |
|---|---|---|
| `docker-compose.production.yml` | Project root | Production container definitions |
| `.env.production` | Project root (gitignored) | Production secrets & config |
| `Dockerfile` | Project root | Multi-stage image build |
| `Makefile` | Project root | Command shortcuts |
| `deploy/nginx-ai.htut.com.conf.example` | deploy/ | Nginx config template |

### Key Ports

| Port | Where | Purpose |
|---|---|---|
| 80 | Host Nginx | HTTP |
| 443 | Host Nginx | HTTPS |
| 8080 | Docker (localhost only) | Laravel app |
| 3306 | Docker (internal only) | MariaDB |
| 6379 | Docker (internal only) | Redis |

### Production Architecture Summary

```text
Server (Ubuntu VPS)
    │
    ├── Host Nginx (:80/:443) — HTTPS termination + reverse proxy
    │
    └── Docker Engine
         │
         ├── PHP Container (:8080 localhost) — Laravel app
         │    ├── Nginx (internal)
         │    └── PHP-FPM
         │
         ├── Queue Container — background jobs
         ├── Scheduler Container — cron tasks
         ├── MariaDB Container (:3306 internal) — database
         └── Redis Container (:6379 internal) — cache/queue
```

# Docker Production Deployment Guide (Myanmar) — HTUT AI Backend

## အကျဉ်ချုပ် (Overview)

ဒီစာတမ်းသည် HTUT AI Backend project ကို Docker ဖြင့် **အသစ် Ubuntu VPS server တစ်ခုပေါ်** production deployment လုပ်နည်းကို **အဆင့်ဆင့်** မြန်မာဘာသာဖြင့် သင်ပေးထားသည်။

> **ဖတ်သူအတွက် ရည်ရွယ်ချက်**: "ငါ့မှာ server အသစ်တစ်ခုရှိတယ်။ ဘာတွေ install လုပ်ရမလဲ? Project ကို ဘယ်မှာထားရမလဲ? Docker ကို ဘယ်လို install လုပ်ရမလဲ? Laravel application ကို Docker image ဘယ်လိုဖြစ်အောင်လုပ်ရမလဲ? Container တွေ ဘယ်လိုစတင်ရမလဲ? Nginx က Docker ကို ဘယ်လိုချိတ်ဆက်ရမလဲ? Domain ကို server ကို ဘယ်လိုဆက်ရမလဲ? HTTPS ဘယ်လိုအလုပ်လုပ်ရမလဲ? Database က ဘယ်လိုအလုပ်လုပ်ရမလဲ? နောက် code change တွေကို ဘယ်လို deploy ရမလဲ?"

ဒီစာတမ်းကို ဖတ်ပြီးသွားရင် **command ဘာတွေ run ရမလဲ** ရော၊ **ဘာကြောင့် run ရတာလဲ** ရော၊ **command run ပြီးရင် server ပေါ်မှာ ဘာတွေပြောင်းသွားလဲ** ရော၊ **component တွေအားလုံး ဘယ်လိုချိတ်ဆက်နေလဲ** ရော နားလည်သွားမည်ဖြစ်သည်။

---

## ၁. ဘာတွေဖန်တီးနေတာလဲ (What We Are Building)

### ထုတ်လုပ်မည့် Architecture

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

### ဒီ diagram ရဲ့ အဓိပ္ပာယ် (Myanmar)

ဒီ diagram က ငါတို့ application ရဲ့ production architecture ကို ပြထားတာပါ။ အောက်ပါအတိုင်း ရှင်းပြမယ်:

**Physical Server (VPS)** — ငါတို့ Ubuntu VPS server က ကွန်ပျူတာတစ်ခုလိုပဲ။ DigitalOcean droplet, AWS EC2, သို့မဟုတ် တခြား VPS provider ကနေ ငှားထားတဲ့ server တစ်ခုပါ။ SSH နဲ့ login ဝင်ပြီး command တွေ run လို့ရတယ်။

**Docker Engine** — VPS server ထဲမှာ install ထားတဲ့ software တစ်ခုပါ။ Container တွေကို run ဖို့ အသုံးပြုတယ်။ Docker engine မရှိရင် container ဘာမှ run လို့မရဘူး။

**Container** — Container ဆိုတာ isolated environment တစ်ခုပါ။ ငါတို့ application (Laravel) ကို container ထဲမှာ run တာကြောင့် server ရဲ့ system files တွေနဲ့ ရောမသွားဘူး။ Container ကို stop/delete လုပ်လိုက်ရင် application ပဲ ရပ်သွားတယ်၊ server ကျန်တဲ့ system ကတော့ ထိခိုက်မသွားဘူး။

**Laravel/PHP Container** — ငါတို့ Laravel application ကို run နေတဲ့ container ပါ။ serversideup/php:8.4-fpm-nginx base image ပေါ်မှာ ဆောက်ထားတယ်။ Nginx + PHP-FPM နှစ်ခုလုံး ဒီ container ထဲမှာ ပါဝင်တယ်။ Port 8080 မှာ listen လုပ်ထားတယ်။

**MariaDB Container** — Database server ပါ။ MySQL compatible database တစ်ခုဖြစ်ပြီး container ထဲမှာ run တယ်။ Port 3306 မှာ run ပေမယ့် server ရဲ့ public port အဖြစ် မထုတ်ထားဘူး။ Docker internal network ကနေသာ Laravel container နဲ့ ချိတ်ဆက်ထားတယ်။

**Redis Container** — Cache နဲ့ queue အတွက် အသုံးပြုတဲ့ in-memory data store ပါ။ MariaDB လိုပဲ container ထဲမှာ run ပြီး Docker internal network ကနေသာ ချိတ်ဆက်ထားတယ်။

**Host Nginx** — VPS server ရဲ့ host level မှာ run နေတဲ့ Nginx ပါ။ Port 80 (HTTP) နဲ့ port 443 (HTTPS) မှာ listen လုပ်ထားတယ်။ User request တွေကို လက်ခံပြီး Laravel container ရဲ့ port 8080 ကို ပြန်ပို့ပေးတယ်။ ဒါကြောင့် "reverse proxy" လို့ ခေါ်တယ်။

**Port 8080 ကို Public မထုတ်တဲ့ အကြောင်းရင်း** — ငါတို့ port 8080 ကို `127.0.0.1` (localhost) မှာသာ publish ထားတယ်။ ဒါကြောင့် server ရဲ့ ပြင်ပကနေ port 8080 ကို တိုက်ရိုက်ဝင်လို့ မရဘူး။ Host Nginx ကသာ HTTPS traffic ကို port 8080 ကို ပို့ပေးတယ်။ ဒါက security အတွက် အရေးကြီးတယ်။

### Browser Request ဘယ်လိုသွားသလဲ

```text
User browser ထဲ "https://ai.htut.com" ရိုက်တယ်
    ↓
DNS server က domain ကို server IP ပြောင်းပေးတယ်
    ↓
Request က server public IP ကိုရောက်တယ်
    ↓
Host Nginx (:443) က request ကိုလက်ခံတယ်
    ↓
Host Nginx က 127.0.0.1:8080 ကို proxy ပို့တယ်
    ↓
Docker PHP container က request ကိုလက်ခံတယ်
    ↓
Laravel က request ကို process လုပ်တယ်
    ↓
Laravel က MariaDB/Redis နဲ့ စကားပြောတယ်
    ↓
Response က browser ကိုပြန်ရောက်တယ်
```

---

## ၂. Technology Stack

ဒီ project မှာ အသုံးပြုထားတဲ့ technology တွေက:

| Technology | Version | ဘာအတွက်လဲ |
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

## ၃. ကြိုတင်ပြင်ဆင်ရန် (Prerequisites)

ဒီ documentation ကို follow ဖို့:

- **Ubuntu VPS server တစ်ခု** — DigitalOcean droplet, AWS EC2, Vultr, Linode, etc.
- **Domain name တစ်ခု** — ဥပမာ: `ai.htut.com`
- **SSH access** — server root user ကို SSH နဲ့ login ဝင်လို့ရရမယ်
- **GitHub account** — project repository ကို access ရှိရမယ်
- **DNS management access** — domain ရဲ့ DNS records ကို edit လို့ရရမယ်

---

## ၄. Production Deployment — Server အသစ်မှ စတင်ခြင်း (Production Deployment From Zero)

### ဒီ section ရဲ့ assumption

```text
Ubuntu VPS
Public IP: SERVER_IP
Domain: ai.htut.com
```

### Step 1: Server ကို SSH နဲ့ login ဝင်ခြင်း

```bash
ssh root@SERVER_IP
```

**ဘာကြောင့်လဲ**: Server ကို control လုပ်ဖို့ terminal access လိုတယ်။ SSH က server ရဲ့ command line ကို သင့် computer ကနေ ထိန်းချုပ်ခွင့်ပေးတယ်။

**ဖြစ်သင့်တာ**: Login ဝင်ပြီးရင် terminal prompt ပေါ်လာမယ်။ `root@server:~#` လိုမျိုး။

---

## ၅. Server Preparation — ဘာတွေ Install ရမလဲ

Server အသစ်ထဲမှာ package တွေ install ဖို့ command run ပါ:

```bash
apt update
apt install -y \
    docker.io \
    docker-compose-v2 \
    git \
    nginx \
    ufw
```

**ဘာကြောင့်လဲ**:

| Package | ဘာအတွက်လဲ |
|---|---|
| `docker.io` | Docker Engine — container တွေ run ဖို့ |
| `docker-compose-v2` | Docker Compose — multi-container apps manage ဖို့ |
| `git` | Project code ကို server ပေါ် clone ဖို့ |
| `nginx` | Host-level reverse proxy — HTTPS termination နဲ့ traffic forwarding အတွက် |
| `ufw` | Firewall — server ရဲ့ ports တွေကို ထိန်းချုပ်ဖို့ |

### Install ပြီးကြောင်း စစ်ဆေးခြင်း (Verify)

```bash
docker --version
docker compose version
git --version
nginx -v
```

**ဖြစ်သင့်တာ**: တစ်ခုချင်းစီက version number ပြရမယ်။ တစ်ခုခု error ထွက်ရင် `apt install` command ကို ပြန်စစ်ပါ။

---

## ၆. Firewall Setup — Server ကို လုံခြုံအောင်လုပ်ခြင်း

Firewall က server ရဲ့ ports တွေကို ဘယ်သူတွေ ဝင်ခွင့်ရှိတယ်ဆိုတာ ထိန်းချုပ်ပေးတယ်။

### UFW Configuration

```bash
# SSH port ဖွင့်ထားရမယ် — server ကို remote access ဝင်ဖို့
ufw allow OpenSSH

# HTTP (port 80) နဲ့ HTTPS (port 443) ဖွင့်ထားရမယ်
ufw allow 80/tcp
ufw allow 443/tcp

# Firewall ကို activate လုပ်
ufw enable

# Configuration ပြန်စစ်ဆေး
ufw status
```

### ဘယ် ports တွေကို Public မဖွင့်ရသလဲ

| Port | ဘာလဲ | ဘာကြောင့် မဖွင့်ရသလဲ |
|---|---|---|
| 3306 | MariaDB | Database — ပြင်ပကနေ တိုက်ရိုက်ချိတ်ဆက်ခွင့် မပေးရဘူး။ Docker internal network ကနေသာ Laravel container နဲ့ ချိတ်ထားတယ် |
| 6379 | Redis | Cache/Queue — database လိုပဲ Docker internal network ကနေသာ ချိတ်ထားတယ် |
| 8080 | Laravel App | Laravel app port — host Nginx ကသာ localhost ကနေ ပို့တယ်။ ပြင်ပကနေ တိုက်ရိုက်ဝင်စရာ မလိုဘူး |

**အရေးကြီးတာ**: MariaDB နဲ့ Redis က container အချင်းချင်း Docker ရဲ့ internal network ကနေ စကားပြောတယ်။ Port ပြင်ပကနေ ဖွင့်စရာ မလိုဘူး။ ဖွင့်လိုက်ရင် security ပြဿနာ ဖြစ်နိုင်တယ်။

---

## ၇. Project Deployment Directory — Code ကို ဘယ်မှာထားရမလဲ

### Deployment directory ကို ဘာကြောင့် `/var/www/htut-ai` ထားရသလဲ

- Linux server တွေမှာ web application တွေကို ပုံမှန် `/var/www/` ထဲမှာ ထားတယ်
- `htut-ai` က project name ဖြစ်ပြီး multiple projects ရှိရင် ခွဲခြားလို့ရအောင်
- Git clone ပြီးရင် project root က `/var/www/htut-ai` ဖြစ်မယ်

### Code ကို Clone ခြင်း

```bash
# Deploy directory ဖန်တီး
mkdir -p /var/www
cd /var/www

# Project code ကို clone
git clone git@github.com:AI-Face-Swap/admin-dashboard.git htut-ai

# Project directory ထဲဝင်
cd /var/www/htut-ai
```

### Clone ပြီးနောက် server filesystem ပုံ

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

## ၈. GitHub Deploy Key — Server ကို Repository Access ပေးခြင်း

Production server က private GitHub repository ကို code pull ဖို့ SSH access လိုတယ်။ Deploy key က read-only access သာ ပေးတာကြောင့် လုံခြုံတယ်။

### ဘယ်လိုလုပ်ရသလဲ

```text
GitHub Repository Settings → Deploy keys → Add deploy key
```

### Step 1: Server ရဲ့ SSH public key ကို ထုတ်ယူခြင်း

Server ပေါ်မှာ:

```bash
cat ~/.ssh/id_rsa.pub
```

> တစ်ခုခု မရှိရင်: `ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""` နဲ့ generate လုပ်ပါ

### Step 2: GitHub မှာ Deploy Key ထည့်ခြင်း

1. `https://github.com/AI-Face-Swap/admin-dashboard/settings/keys` ကို သွားပါ
2. **"Add deploy key"** ကို click ပါ
3. **Title**: `htut-ai-production-server` လို ထည့်ပါ
4. **Key**: Server ရဲ့ public key ကို paste ပါ
5. **Allow read-only access** ကို check ပါ (write access မလိုဘူး)
6. **"Add key"** ကို click ပါ

### Deploy Key ရဲ့ အဓိပ္ပာယ်

```text
GitHub Repository
        ↑
        │ SSH (read-only access)
        │
Production Server
```

Server က code ကို `git pull` နဲ့ ထုတ်ယူလို့ရတယ်၊ ဒါပေမယ့် `git push` လုပ်လို့ မရဘူး။ ဒါက security အတွက် ကောင်းတယ်။

---

## ၉. Production Environment Configuration — `.env.production` ဖန်တီးခြင်း

### Environment Variable ဆိုတာ ဘာလဲ

Application ကို run ဖို့ လိုအပ်တဲ့ secret values (database password, API keys, etc.) တွေကို environment variable တွေအဖြစ် သိမ်းထားတယ်။

### ဘာကြောင့် `.env.production` file သီးသန့်လိုသလဲ

```text
Host (server):
.env.production     ← ဒီ file ကို server ပေါ်မှာ edit လုပ်တယ်
       │
       │ environment injection (docker compose env_file)
       ▼
Docker container:
Laravel receives APP_KEY, DB_*, REDIS_*, etc.
```

**အရေးကြီးတာ**: `.env.production` file ကို Docker image ထဲမှာ **မထည့်ဘူး**။ Host server ပေါ်မှာသာ ရှိတယ်။ Container စတင်တဲ့အခါ Docker Compose က host file ထဲက values တွေကို container ထဲကို inject လုပ်ပေးတယ်။

### `.env.production` ဖန်တီးခြင်း

```bash
cp .env.production.example .env.production
nano .env.production
```

### ဖြည့်ရမည့် အဓိက variables များ

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

### `DB_HOST=mysql` ဘာကြောင့် မှန်သလဲ

**အရေးကြီးတဲ့ ခြားနားချက်**:

```text
✅ DB_HOST=mysql     ← Docker container ထဲမှာ: "mysql" က Docker service name
❌ DB_HOST=localhost  ← Docker container ထဲမှာ: wrong! localhost က container ကိုယ်တိုင်ကို ဆိုလိုတယ်
```

Docker Compose က container တွေကို network တစ်ခုထဲမှာ ချိတ်ပေးတယ်။ Service name `mysql` ကို သုံးရင် Docker က MariaDB container ရဲ့ IP address ကို အလိုအလျောက် ရှာပေးတယ်။

---

## ၁၀. APP_KEY Generation — အရေးအကြီးဆုံး အဆင့်

### APP_KEY ဘာကြောင့် လိုသလဲ

Laravel က encryption, session handling, token generation အတွက် APP_KEY ကို အသုံးပြုတယ်။ APP_KEY မရှိရင် application က 500 error ပြမယ်။

### Generate နည်း (ဒီ project ရဲ့ actual method)

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  run --rm php php artisan key:generate --show
```

**ဘာကြောင့် ဒီ command သုံးရသလဲ**:

- `--env-file .env.production` — container ထဲမှာ environment variables တွေ inject လုပ်ပေးတယ်
- `-f docker-compose.production.yml` — production compose file ကို အသုံးပြုတယ်
- `run --rm` — container ကို run ပြီးရင် ပြန်ဖျက်ပေးတယ် (temporary)
- `php artisan key:generate --show` — key ကို generate ပြီး terminal ပေါ်မှာ ပြပေးတယ်

### Generated Key ကို `.env.production` ထဲထည့်ခြင်း

Command output မှာ key ပါလာမယ်။ ဒါကို copy ယူပြီး `.env.production` ထဲမှာ `APP_KEY=` ရဲ့ နောက်မှာ ထည့်ပါ:

```env
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```bash
nano .env.production
# APP_KEY= line ကို ရှာပြီး paste ထည့်ပါ
```

### ⚠️ ဘာကြောင့် `php artisan key:generate` တိုက်ရိုက် မလုပ်ရသလဲ

```text
❌  docker compose exec php php artisan key:generate

ဘာကြောင့် wrong လဲ:
- Image ထဲမှာ .env file မရှိ (by design)
- artisan command က /var/www/html/.env ကို ရှာတယ်
- File မတွေ့ရင် error ဖြစ်မယ်
- key:generate --show က key ကို terminal ပေါ်မှာ ပြပေးပြီး host file ထဲ ထည့်ရတယ်
```

---

## ၁၁. Docker Image — Build မတိုင်ခင် နားလည်ရန်

User က deployment steps တွေ နားလည်ပြီးမှ Docker image ကို ရှင်းပြတယ်။

### `docker build` command run ရင် ဘာဖြစ်သလဲ

```bash
docker build -t ghcr.io/ai-face-swap/admin-dashboard:latest .
```

ဒီ command က project source code ကို Docker image အဖြစ် ပြောင်းပေးတယ်။ သုံးဆင့် (3 stages) ပါဝင်တယ်:

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

### တစ်ဆင့်ချင်းရှင်းလင်းချက်

**Stage 1 — PHP dependencies + Wayfinder**

```dockerfile
FROM serversideup/php:8.4-fpm-nginx AS vendor
WORKDIR /var/www/html
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction --no-progress
COPY --chown=www-data:www-data . .
RUN composer dump-autoload --optimize && php artisan wayfinder:generate --with-form
```

- `composer install --no-dev`: Production dependencies သာ install (test tools မပါ)
- `--optimize-autoloader`: Class loading speed မြင့်မားစေတယ်
- `wayfinder:generate --with-form`: TypeScript typed routes generate လုပ်တယ် — ဘာကြောင့် Stage 1 မှာလဲ? Node container ထဲမှာ PHP မပါလို့။ PHP container ကိုပဲသုံးပြီး generate ရတယ်

**Stage 2 — Frontend assets**

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

- `npm ci`: package-lock.json အတိုင်း exact dependencies install
- Font cache (committed): Hermetic build အတွက် — build အချိန်မှာ network call မလို
- `COPY --from=vendor`: Stage 1 က generate ထားတဲ့ Wayfinder files တွေကို ယူတယ်
- `npm run build`: Vite က JS/CSS assets တွေကို compile → `public/build/` ထဲထုတ်ပေးတယ်

**Stage 3 — Final production image**

```dockerfile
FROM serversideup/php:8.4-fpm-nginx
WORKDIR /var/www/html
COPY --chown=www-data:www-data . .
RUN rm -f bootstrap/cache/packages.php bootstrap/cache/services.php
COPY --from=vendor --chown=www-data:www-data /var/www/html/vendor ./vendor
COPY --from=assets --chown=www-data:www-data /app/public/build ./public/build
```

- Laravel source code ကို copy
- Dev cache manifests ဖျက်
- Stage 1 က vendor/ ကို ယူ
- Stage 2 က public/build/ ကို ယူ

### Image Size ခြားနားချက်

```text
Single-stage (naive approach):   ~1.5 GB+
  - Node + PHP + vendor + dev deps + source အားလုံးပါ

Multi-stage (actual project):   ~250 MB
  - Stage 1 နဲ့ Stage 2 ကို discard, Stage 3 (final) သာ output image
```

---

## ၁၂. Build Image — Production Image ဖန်တီးခြင်း

### Command

Server ပေါ်မှာ project directory ထဲမှာ:

```bash
docker build -t ghcr.io/ai-face-swap/admin-dashboard:latest .
```

**ဒီ command က ဘာပြောင်းသွားစေသလဲ**:
- Source code ကို compile/optimization လုပ်ပြီး Docker image အဖြစ် package လုပ်တယ်
- Image ကို `ghcr.io/ai-face-swap/admin-dashboard:latest` အဖြစ် tag တပ်တယ်
- Server ရဲ့ disk space ထဲမှာ image သိမ်းဆည်းတယ်

### Image ဖန်တီးပြီးကြောင်း စစ်ဆေးခြင်း

```bash
docker images
```

**ဖြစ်သင့်တာ**: `ghcr.io/ai-face-swap/admin-dashboard` tag နဲ့ image တစ်ခု ပေါ်လာမယ်။ Size က ~250MB ခန့် ဖြစ်ရမယ်။

### Image ထဲမှာ ဘာတွေပါဝင်သလဲ

```text
✅ Image ထဲ ပါဝင်သည့်အရာများ:
  - Laravel source code
  - vendor/ (PHP dependencies — no-dev, optimized)
  - public/build/ (compiled Vite assets)
  - Wayfinder typed routes (resources/js/actions, routes, wayfinder)
  - PHP 8.4 runtime
  - Nginx (serversideup image built-in)
  - Composer autoloader (optimized)

❌ Image ထဲ မပါဝင်သည့်အရာများ:
  - .env.production (host ပေါ်မှာသာ)
  - Database data (MariaDB container ထဲမှာသာ)
  - Redis data (Redis container ထဲမှာသာ)
  - Runtime secrets (API keys, passwords — env injection ဖြင့်)
```

### Optional: Image ထဲရှိ files တွေကို စစ်ဆေးခြင်း

```bash
docker run --rm ghcr.io/ai-face-swap/admin-dashboard:latest ls -la /var/www/html/public/build
```

**ဖြစ်သင့်တာ**: Vite build output files တွေ (JS, CSS) ပေါ်လာရမယ်။

---

## ၁၃. Production Docker Compose Start — Container တွေ စတင်ခြင်း

### Production Stack စတင်ခြင်း

```bash
cd /var/www/htut-ai

make prod-up
```

ဒီ command ကို run ရင် Docker Compose က `docker-compose.production.yml` ထဲမှာ ဖော်ပြထားတဲ့ container အားလုံးကို စတင်ပေးတယ်။

### Container တွေ စတင်ပြီးကြောင်း စစ်ဆေးခြင်း

```bash
make prod-ps
```

**ဖြစ်သင့်တာ**: အောက်ပါ container အားလုံး `Up (healthy)` ဖြစ်ရမယ်:

```text
Docker Compose Production Stack
      │
      ├── php          (web application — Nginx + PHP-FPM)
      ├── queue        (background job worker)
      ├── scheduler    (cron/scheduled task runner)
      ├── mysql        (MariaDB database)
      └── redis        (cache + queue backend)
```

### တစ်ခုချင်းစီ container ရဲ့ role

| Container | Run နေတဲ့ Command | ဘာလုပ်သလဲ |
|---|---|---|
| `php` | Default (Nginx + PHP-FPM) | HTTP request တွေကို လက်ခံပြီး Laravel ကို run တယ်။ Port 8080 မှာ listen လုပ်ထားတယ် |
| `queue` | `php artisan queue:work --tries=3 --timeout=600` | Background jobs တွေကို process လုပ်တယ် (video face-swap, image processing, etc.) |
| `scheduler` | `php artisan schedule:work` | Cron jobs တွေကို run တယ် (cleanup commands, scheduled tasks) |
| `mysql` | MariaDB 11 | Database server — application ရဲ့ data တွေကို သိမ်းထားတယ် |
| `redis` | `redis-server --appendonly yes` | Cache, queue backend, session storage |

---

## ၁၄. Same Image, Different Containers — ဘာကြောင့် တူညီတဲ့ image သုံးသလဲ

### Container သုံးခု — တူညီတဲ့ image, ကွဲပြားတဲ့ commands

```text
php container:
  → Default entrypoint (Nginx + PHP-FPM)
  → HTTP request တွေကို serve တယ်

queue container:
  → php artisan queue:work --tries=3 --timeout=600
  → Background jobs တွေကို process တယ်

scheduler container:
  → php artisan schedule:work
  → Cron jobs တွေကို run တယ်
```

**ဘာကြောင့် ဒီ architecture ကောင်းသလဲ**:

1. **Identical codebase** — container သုံးခုလုံး တူညီတဲ့ application code ကို အသုံးပြုတယ်
2. **Single build** — image ကို တစ်ခါပဲ build ရတယ်
3. **Easy rollback** — image tag တစ်ခုတည်းကို change လုပ်လိုက်ရင် container သုံးခုလုံး ပြောင်းသွားတယ်
4. **Separate concerns** — web request processing နဲ့ background job processing ကို ခွဲထားလို့ တစ်ခုခု fail ရင် တစ်ခုတည်းသာ ထိခိုက်တယ်

---

## ၁၅. Database and Volumes — Data ကို ဘယ်မှာသိမ်းသလဲ

### Docker Volume ဆိုတာ ဘာလဲ

Container ကို stop ရင်/recreate ရင် container ထဲရှိ data တွေ ပျောက်သွားနိုင်တယ်။ Docker volume က data တွေကို host server ပေါ်မှာ သိမ်းထားပေးတယ်။ Container ပြန်စရင် volume ထဲက data ကို ပြန်ယူပြီး ဆက်သုံးတယ်။

### ဘယ် volumes တွေ ရှိသလဲ

```text
MariaDB container
      │
      ▼
Docker volume: mysql_data
      │
      ▼
Database data (tables, records) — container ပြန်စရင် ဒီ data ပဲ ဆက်ရှိမယ်

Redis container
      │
      ▼
Docker volume: redis_data
      │
      ▼
Cache + queue data — container ပြန်စရင် ဒီ data ပဲ ဆက်ရှိမယ်

PHP container
      │
      ▼
Docker volume: php_logs
      │
      ▼
Laravel log files — container ပြန်စရင် log files ပဲ ဆက်ရှိမယ်
```

### `docker compose down` vs `docker compose down -v`

```bash
# ✅ လုံခြုံတယ် — container တွေပဲ ရပ်တယ်၊ database data ကျန်တယ်
make prod-down
# ဒါမှမဟုတ်
docker compose --env-file .env.production -f docker-compose.production.yml down

# ❌ အန္တရာယ်ရှိတယ် — container တွေရော data volumes တွေပါ ဖျက်သွားမယ်
docker compose down -v
```

> ⚠️ **Production မှာ `docker compose down -v` ကို ဘယ်တော့မှ မသုံးပါနဲ့** — database volume (`mysql_data`) ဖျက်သွားရင် application ရဲ့ data အားလုံး ဆုံးရှုံးသွားမယ်။

---

## ၁၆. Migration — Database Schema Update

### Migration ဘာကြောင့် လိုသလဲ

Laravel က database schema changes တွေကို migration files အဖြစ် သိမ်းထားတယ်။ New table ထည့်ခြင်း, column ထည့်ခြင်း, index ထည့်ခြင်း စတာတွေကို migration command နဲ့ လုပ်ရတယ်။

### Automatic Migration (Container Startup)

ဒီ project မှာ `AUTORUN_ENABLED=true` သတ်မှတ်ထားတာကြောင့် container စတင်တဲ့အခါ migrations တွေ **အလိုအလျောက်** run ဖြစ်သွားတယ်:

```text
Container စတင်
    ↓
serversideup image က AUTORUN_ENABLED=true ကို စစ်တယ်
    ↓
php artisan migrate --force run ဖြစ်တယ်
    ↓
Database schema အသစ် update ဖြစ်တယ်
```

### Manual Migration

```bash
make prod-migrate
```

**ဘယ်အချိန် manual run ရသလဲ**:
- AUTORUN migration မအောင်မြင်ရင်
- Migration ကို force ဖြင့် ပြန် run ချင်ရင်
- Container log ထဲမှာ migration error ပြနေရင်

### Image Build Time vs Application Startup Time

```text
Image Build (docker build):
  ✅ composer install
  ✅ npm run build
  ✅ wayfinder:generate
  ❌ php artisan migrate (migration မလုပ်ဘူး)

Application Startup (docker compose up):
  ❌ composer install (vendor က image ထဲမှာ ပြီးသား)
  ❌ npm run build (assets က image ထဲမှာ ပြီးသား)
  ✅ php artisan migrate (AUTORUN_ENABLED=true)
  ✅ config:cache, route:cache, view:cache (serversideup image handle)
```

---

## ၁၇. Health Check — Application အလုပ်လုပ်နေကြောင်း စစ်ဆေးခြင်း

### Health Check Command

```bash
curl http://127.0.0.1:8080/healthcheck
```

**ဘာကြောင့် ဒီ step ကို DNS/HTTPS configure မလုပ်ခင် လုပ်ရသလဲ**:

- Container ကောင်းကောင်း run နေလား စစ်ဖို့
- Laravel application က response ပြန်နေလား စစ်ဖို့
- Nginx container က port 8080 မှာ listen လုပ်နေလား စစ်ဖို့
- Database connection ကောင်းကောင်းလုပ်နေလား စစ်ဖို့

**ဖြစ်သင့်တာ**: `OK` ဒါမှမဟုတ် JSON response ပြန်ရမယ်။

### Health Check မအောင်မြင်ရင် ဘာလုပ်ရသလဲ

**ရပ်ပြီး troubleshooting လုပ်ပါ** — DNS နဲ့ HTTPS ကို ဆက်မလုပ်ပါနဲ့:

```bash
# Container status စစ်ဆေး
make prod-ps

# PHP container logs ကြည့်
make prod-logs s=php

# MySQL container logs ကြည့်
make prod-logs s=mysql

# Redis container logs ကြည့်
make prod-logs s=redis

# Queue container logs ကြည့်
make prod-logs s=queue
```

**ဖြစ်နိုင်တဲ့ ပြဿနာများ**:
- Container health check fail → container logs ကြည့်
- MySQL unhealthy → database password မှားနေခြင်း
- APP_KEY မရှိ → 500 error
- Port 8080 conflict → `ss -tlnp | grep 8080` နဲ့ စစ်

---

## ၁၈. Request Flow — Browser Request ဘယ်လိုသွားသလဲ

### How One Browser Request Reaches Laravel

```text
User browser ထဲမှာ URL ရိုက်တယ်
   ↓
DNS Server က domain → IP address ပြောင်းပေးတယ်
   ↓
Request က Server Public IP ကိုရောက်တယ်
   ↓
Host Nginx (:443 HTTPS) က request ကိုလက်ခံတယ်
   ↓
Host Nginx က 127.0.0.1:8080 ကို proxy ပို့တယ်
   ↓
Docker PHP Container (port 8080) က request ကိုလက်ခံတယ်
   ↓
Nginx (container internal) → PHP-FPM → Laravel
   ↓
Laravel Router → Controller → Service
   ↓
Laravel က MariaDB container နဲ့ စကားပြောတယ်
Laravel က Redis container နဲ့ စကားပြောတယ်
   ↓
Response ပြန်လည်ဖွဲ့စည်းတယ်
   ↓
Response က Host Nginx → Browser ကို ပြန်ရောက်တယ်
```

### တစ်ဆင့်ချင်း အသေးစိတ်

**Hop 1: Browser → DNS**
User browser က `https://ai.htut.com` ကို DNS server ကို မေးတယ်။ DNS server က `ai.htut.com` ရဲ့ IP address ကို ပြန်ပေးတယ်။

**Hop 2: DNS → Server IP**
DNS က server ရဲ့ public IP address (ဥပမာ `123.45.67.89`) ကို ပြန်ပေးတယ်။

**Hop 3: Request → Server (Port 443)**
Browser က server IP ရဲ့ port 443 (HTTPS) ကို TCP connection ဆက်တယ်။ SSL/TLS handshake ဖြစ်ပြီး encrypted connection တည်ဆောက်တယ်။

**Hop 4: Host Nginx (Port 443)**
Host Nginx က HTTPS request ကို လက်ခံတယ်။ `server_name ai.htut.com` config အတိုင်း ဒီ domain အတွက်ရှိတဲ့ site config ကို ရှာတယ်။

**Hop 5: Nginx → 127.0.0.1:8080**
Host Nginx က `proxy_pass http://127.0.0.1:8080` အတိုင်း request ကို Docker PHP container ရဲ့ port 8080 ကို ပို့တယ်။

**Hop 6: Docker Container → Laravel**
PHP container ရဲ့ internal Nginx က request ကို PHP-FPM ကို ပို့တယ်။ PHP-FPM က Laravel application ကို boot/run တယ်။

**Hop 7: Laravel → Database/Redis**
Laravel က `DB_HOST=mysql` config အတိုင်း Docker network ကနေ MariaDB container ကို ချိတ်တယ်။ Redis ကိုလည်း ဒီလိုပဲ ချိတ်တယ်။

---

## ၁၉. Domain / DNS Configuration

### DNS Record ဖန်တီးခြင်း

Domain registrar ရဲ့ DNS management panel ထဲမှာ:

```text
Type:   A
Name:   ai
Value:  SERVER_IP (ဥပမာ: 123.45.67.89)
TTL:    3600 (or default)
```

**ဘာကြောင့် A record လဲ**: A record က domain name ကို IPv4 address နဲ့ ချိတ်ပေးတယ်။ `ai.htut.com` ကို type in ရင် DNS server က server IP ပြန်ပေးမယ်။

### DNS Propagation စစ်ဆေးခြင်း

```bash
dig ai.htut.com
# ဒါမှမဟုတ်
nslookup ai.htut.com
```

**ဖြစ်သင့်တာ**: Server ရဲ့ public IP address ပြရမယ်။

**မှတ်ချက်**: DNS propagation ကို စောင့်ရတယ် (တစ်ခါတစ်ရံ မိနစ်အနည်းငယ်မှ နာရီအနည်းငယ်အထိ)။ propagation မပြီးခင် certbot run ရင် certificate ရမှာ မဟုတ်ဘူး။

---

## ၂၀. Host Nginx — Reverse Proxy Setup

### Host Nginx ဘာကြောင့် လိုသလဲ

```text
Internet traffic (port 80/443)
         ↓
Host Nginx (port 80/443)
         ↓
Docker container (port 8080 — localhost only)
```

Host Nginx က:
1. **HTTPS termination** — SSL certificate ကို host Nginx က manage တယ်
2. **Traffic forwarding** — request ကို Docker container ကို proxy ပို့တယ်
3. **Multiple sites** — host Nginx က တခြား projects ကိုလည်း serve လို့ရတယ်
4. **Security** — port 8080 ကို public မဖွင့်ဘဲ internal သာ ချိတ်ထားလို့ရတယ်

### Nginx Config ထည့်ခြင်း

```bash
# Nginx config file ကို copy
cp deploy/nginx-ai.htut.com.conf.example /etc/nginx/sites-available/htut-ai

# Config ကို enable လုပ်
ln -s /etc/nginx/sites-available/htut-ai /etc/nginx/sites-enabled/htut-ai

# Config ကို စစ်ဆေး
nginx -t

# Nginx ကို reload
systemctl reload nginx
```

### Nginx Config File ရဲ့ အဓိပ္ပာယ်

```nginx
server {
    listen 80;                    # HTTP port မှာ listen
    listen [::]:80;               # IPv6 အတွက်လည်း
    server_name ai.htut.com;      # ဒီ domain အတွက်သာ

    client_max_body_size 100M;    # Upload size limit

    location / {
        proxy_pass http://127.0.0.1:8080;  # Docker container ကို proxy
        proxy_http_version 1.1;

        # Headers များ — Laravel ကို real client info ပေးဖို့
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

**`sites-available` vs `sites-enabled`**:
- `sites-available/` — Nginx config files တွေကို သိမ်းထားတဲ့ directory
- `sites-enabled/` — symlink တွေပဲ ရှိတယ်။ ဘယ် config ကို active လုပ်မလဲ ဆိုတာ ဒီ directory ကနေ ဆုံးဖြတ်တယ်
- Site တစ်ခုကို disable ချင်ရင် `sites-enabled/` ထဲက symlink ကို ဖျက်ပြီး Nginx reload

**`proxy_pass`**:
- Host Nginx က request ကို `127.0.0.1:8080` ကို ပို့တယ်
- `127.0.0.1` = localhost (server ကိုယ်တိုင်)
- Port 8080 = Docker PHP container

---

## ၂၁. HTTPS / Certbot — SSL Certificate ထည့်ခြင်း

### Certbot ဖြင့် HTTPS ဖွင့်ခြင်း

```bash
certbot --nginx -d ai.htut.com
```

**ဒီ command က ဘာလုပ်သလဲ**:
1. Let's Encrypt ကနေ free SSL certificate ရယူတယ်
2. Nginx config ထဲမှာ HTTPS (port 443) block ထည့်ပေးတယ်
3. HTTP → HTTPS auto-redirect ထည့်ပေးတယ်
4. Certificate auto-renewal cron job ထည့်ပေးတယ်

### HTTPS ဘယ်လိုအလုပ်လုပ်သလဲ

```text
HTTP request (port 80)
    ↓
Nginx က HTTPS redirect လုပ်ပေးတယ်
    ↓
HTTPS request (port 443)
    ↓
Let's Encrypt certificate ဖြင့် encryption/decryption
    ↓
127.0.0.1:8080 ကို proxy ပို့
    ↓
Docker PHP container → Laravel
```

### APP_URL Update

HTTPS live ဖြစ်ရင် `.env.production` ထဲမှာ `APP_URL` ကို update ပါ:

```env
APP_URL=https://ai.htut.com
```

**ဘာကြောင့် update ရသလဲ**:
- Laravel က URL generation အတွက် `APP_URL` ကို သုံးတယ်
- Secure cookies, CSRF tokens, redirect URLs တွေအားလုံး `APP_URL` ပေါ် မူတည်တယ်
- HTTP URL ထားရင် HTTPS redirect loops ဖြစ်နိုင်တယ်

### Proxy Handling

Laravel က trusted proxy configuration ပါဝင်ပြီးသားဖြစ်တယ် (`bootstrap/app.php` ထဲမှာ `trustProxies`)။ HTTPS URLs, secure cookies, client IP detection တွေကို အလိုအလျောက် handle လုပ်ပေးတယ်။

---

## ၂၂. Final Verification — Server Live ဖြစ်ကြောင်း အဆုံးအဖြတ်

### Step 1: Container Status

```bash
make prod-ps
```

**ဖြစ်သင့်တာ**: Container အားလုံး `Up (healthy)` ဖြစ်ရမယ်

### Step 2: Health Check

```bash
curl http://127.0.0.1:8080/healthcheck
```

**ဖြစ်သင့်တာ**: `OK` ဒါမှမဟုတ် success JSON response ပြန်ရမယ်

### Step 3: Nginx Status

```bash
systemctl status nginx
nginx -t
```

**ဖြစ်သင့်ဦးတည်ချက်**: Nginx active (running) ဖြစ်ရမယ်။ Config test `successful` ဖြစ်ရမယ်

### Step 4: Browser Test

```text
https://ai.htut.com
```

**ဖြစ်သင့်တာ**:
- HTTPS lock icon ပေါ်နေရမယ်
- Application page ကောင်းကောင်း load ဖြစ်ရမယ်
- No mixed content warnings
- Redirect HTTP → HTTPS အလုပ်လုပ်ရမယ်

### Application Live ဖြစ်ပြီဆိုတဲ့ Sign

```text
✅ make prod-ps → all healthy
✅ curl healthcheck → OK
✅ https://ai.htut.com → loads correctly
✅ HTTPS lock icon visible
✅ HTTP auto-redirects to HTTPS
```

---

## ၂၃. First Deployment vs Future Deployment — ခြားနားချက်

ဒီနှစ်ခုကို အတိအကျ ခွဲခြားနားလည်ဖို့ အရေးကြီးတယ်:

### First Deployment (ပထမဆုံး တစ်ခါတည်း လုပ်ရတာ)

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

**ဒီ documentation ရဲ့ section ၅ မှ ၂၂ အထိ လုပ်ခဲ့တာ** — server အသစ်တစ်ခုမှာ application ကို zero ကနေ setup လုပ်ခြင်း

### Future Deployment (နောက်ပိုင်း update တွေ)

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

**ဒီ section ကို အောက်မှာ ရှင်းပြမယ်**

---

## ၂၄. CI/CD Pipeline — Automated Deployment

CI/CD က developer code push လုပ်လိုက်ရုံနဲ့ application ကို automatic deploy လုပ်ပေးတယ်။ Manual deployment ကို နားလည်ပြီးမှ CI/CD ကို ရှင်းပြတယ်။

### CI/CD Flow

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

### GitHub Actions Config

ဒီ project ရဲ့ `.github/workflows/deploy.yml` မှာ:

**Build Job**:
1. Source code ကို checkout
2. Git short-SHA ကို image tag အဖြစ် တွက်
3. Docker Buildx ဖြင့် multi-stage image build
4. GHCR ကို push (`:latest` + `:<sha>` tags)

**Deploy Job**:
1. SSH key ဖြင့် server ကို connect
2. Code ကို pull
3. Image ကို pull + containers ကို recreate
4. Old images ကို prune

### Image Tags

| Tag | ဘာအတွက်လဲ |
|---|---|
| `latest` | နောက်ဆုံး main branch build — always points to most recent |
| `<short-sha>` | Immutable tag (ဥပမာ: `ghcr.io/.../admin-dashboard:a1b2c3d`) — rollback အတွက် |

**SHA tags ဘာကြောင့် အသုံးဝင်သလဲ**:
- `latest` tag ကို ဘယ်တော့မှ overwrite ဖြစ်တယ် — version ဘယ်ဟောင်းလဲ မသိနိုင်
- SHA tag က specific commit ကို ကိုယ်စားပြုတယ် — exact version ကို ပြန်သွားလို့ရတယ်

### GitHub Secrets Setup

GitHub Repository → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SSH_HOST` | `<SERVER_IP>` |
| `SSH_USER` | `root` |
| `SSH_KEY` | Server မှာ authorized ဖြစ်တဲ့ SSH private key |

---

## ၂၅. Rollback — Version ပြန်ဆုတ်ခြင်း

### Rollback ဘာကြောင့် လိုသလဲ

```text
Version A (working) → Version B (has bug)
                              ↓
                    Rollback to Version A
```

### Rollback Command

```bash
make prod-rollback SHA=<short-sha>
```

**ဥပမာ**:

```bash
# ဘယ် images တွေရှိလဲ ကြည့်
docker images ghcr.io/ai-face-swap/admin-dashboard

# Version A ကို ပြန်သွား
make prod-rollback SHA=a1b2c3d
```

### Rollback ဖြစ်စဉ်

```bash
# Command ကို run ရင် ဘာဖြစ်သလဲ:
# 1. IMAGE_TAG=a1b2c3d ကို environment variable အဖြစ် set
# 2. docker compose up -d --remove-orphans run
# 3. Container တွေကို old image tag နဲ့ recreate
# 4. AUTORUN: php artisan migrate (safe — down migrations အလိုအလျောက် မပြောင်းဘူး)
```

---

## ၂၆. Day-2 Operations — Deploy ပြီးနောက် လုပ်ရမည့်အရာများ

### Status Check

```bash
make prod-ps
```

**ဘယ်အချိန် သုံးသလဲ**: Container တွေ healthy ဖြစ်မဖြစ် စစ်ဖို့

### Log Check

```bash
# အားလုံးရဲ့ log ကြည့်
make prod-logs

# PHP container log သာ ကြည့်
make prod-logs s=php

# MySQL container log သာ ကြည့်
make prod-logs s=mysql

# Queue container log သာ ကြည့်
make prod-logs s=queue
```

**ဘယ်အချိန် သုံးသလဲ**: Error/exception ရှာဖို့, request processing စစ်ဖို့, migration output ကြည့်ဖို့

### Shell Access

```bash
make prod-shell
```

**ဘယ်အချိန် သုံးသလဲ**: Laravel Tinker ဝင်ဖို့, artisan commands run ဖို့, files စစ်ဖို့

### Manual Migration

```bash
make prod-migrate
```

**ဘယ်အချိန် သုံးသလဲ**: AUTORUN migration မအောင်မြင်ရင်, new migration file ထည့်ပြီး manual run ချင်ရင်

### Stop (Database Safe)

```bash
make prod-down
```

**ဘာကြောင့် လုံခြုးသလဲ**: Container တွေပဲ ရပ်တယ်။ Database volume ကျန်တယ်။

### Start Again

```bash
make prod-up
```

### Database Backup

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec mysql mariadb-dump -uroot -p"$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)" \
  htut-ai > backup_$(date +%F).sql
```

**ဘယ်အချိန် သုံးသလဲ**: Regular backup အဖြစ်, major changes မလုပ်ခင်

---

## ၂၇. Database Backup

### Regular Backup Command

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec mysql mariadb-dump -uroot -p"$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)" \
  htut-ai > backup_$(date +%F).sql
```

**ဒီ command က ဘာလုပ်သလဲ**:
1. MariaDB container ထဲဝင်
2. `mariadb-dump` command run
3. Database name: `htut-ai`
4. Output ကို timestamped SQL file အဖြစ် သိမ်းတယ်

### Backup File Restore

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec -T mysql mariadb -uroot -p"$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)" \
  htut-ai < backup_2024-01-15.sql
```

---

## ၂၈. Troubleshooting — ပြဿနာဖြေရှင်းနည်း

### Server Problems

#### SSH ဝင်လို့မရခြင်း

```text
Symptom: ssh root@SERVER_IP ကို connect လုပ်လို့ မရ
Cause:   Firewall က port 22 ကို block ထားခြင်း, ဒါမှမဟုတ် SSH key issue
Command: VPS provider console ကနေ login ဝင်ပြီး ufw status စစ်
Fix:     ufw allow OpenSSH && ufw enable
```

#### Disk Space ပြည့်ခြင်း

```text
Symptom: Container တွေ start မရ, "no space left on device" error
Cause:   Docker images/cache တွေ များလာခြင်း
Command: docker system df
Fix:     docker builder prune -f
```

### Docker Problems

#### Container မတက်ခြင်း

```text
Symptom: make prod-ps ထဲမှာ container "Exit" or "Restarting" ပြနေ
Cause:   Config error, missing env var, port conflict
Command: make prod-logs s=<container-name>
Fix:     Error message ကို ဖတ်ပြီး fix → make prod-restart
```

#### Image Build Failure

```text
Symptom: docker build error
Cause:   Network issue (npm/composer), syntax error in Dockerfile
Command: docker build ရဲ့ output error message ကြည့်
Fix:     Network ပြန်စစ်, Dockerfile ပြန်စစ်
```

#### Container Unhealthy

```text
Symptom: make prod-ps ထဲမှာ "Unhealthy" ပြနေ
Cause:   Health check endpoint fail, application error
Command: curl http://127.0.0.1:8080/healthcheck
Fix:     make prod-logs s=php → error log ကြည့် → fix
```

### Laravel Problems

#### APP_KEY Empty

```text
Symptom: Page 500 error, "Unsupported cipher or incorrect key length"
Cause:   APP_KEY မရှိခြင်း
Command: grep APP_KEY .env.production
Fix:     docker compose --env-file .env.production \
           -f docker-compose.production.yml run --rm php \
           php artisan key:generate --show
         → output ကို .env.production ထဲထည့် → make prod-restart
```

#### Database Connection Error

```text
Symptom: "SQLSTATE[HY000] [2002] Connection refused"
Cause:   DB_HOST မှားနေခြင်း, MySQL container မတက်သေးခြင်း
Command: make prod-ps → mysql container status ကြည့်
Fix:     DB_HOST=mysql (not localhost), mysql container healthy ဖြစ်အောင် စောင့်
```

#### Migration Error

```text
Symptom: Container start အခါ migration error
Cause:   SQL syntax error, column already exists, etc.
Command: make prod-logs s=php → AUTORUN output ကြည့်
Fix:     make prod-shell → php artisan migrate ဖြင့် manual ပြန်ကြည့်
```

### Nginx Problems

#### 502 Bad Gateway

```text
Symptom: Browser ထဲ "502 Bad Gateway"
Cause:   App container down, port 8080 မရှိ
Command: curl http://127.0.0.1:8080/healthcheck
         make prod-ps → php container status ကြည့်
Fix:     make prod-up → container ပြန်တက်အောင်လုပ်
```

#### 504 Gateway Timeout

```text
Symptom: Browser ထဲ "504 Gateway Timeout"
Cause:   Request ကြာမြင့်ခြင်း (video face-swap ကဲ့သို့)
Command: make prod-logs s=php
Fix:     proxy_read_timeout တိုး, application optimize
```

#### Nginx Config Error

```text
Symptom: nginx -t က "test failed" ပြ
Cause:   Config file syntax error
Command: nginx -t → error message ကြည့်
Fix:     Config file ပြန်ပြင် → nginx -t → systemctl reload nginx
```

### DNS / HTTPS Problems

#### DNS Not Resolving

```text
Symptom: Browser ထဲ "server not found"
Cause:   DNS record မထည့်ရသေးခြင်း, propagation မပြီးသေးခြင်း
Command: dig ai.htut.com
Fix:     DNS A record ထည့် → propagation စောင့်
```

#### Certificate Failure

```text
Symptom: certbot run ရင် certificate မရ
Cause:   DNS မရောက်သေးခြင်း, port 80 block ထားခြင်း
Command: dig ai.htut.com, ufw status
Fix:     DNS propagation ပြီးအောင်စောင့် → certbot --nginx -d ai.htut.com
```

#### HTTPS Redirect Loop

```text
Symptom: Browser ထဲ "too many redirects"
Cause:   APP_URL http:// ဖြစ်နေခြင်း, TrustProxy config မရှိခြင်း
Command: grep APP_URL .env.production
Fix:     APP_URL=https://ai.htut.com ပြင်
```

---

## ၂၉. Production Safety Rules

### ⚠️ ဘယ်တော့မှ မလုပ်ရသည့်အရာများ

| Rule | ဘာကြောင့် မလုပ်ရသလဲ |
|---|---|
| `docker compose down -v` | Database volume ဖျက်သွားမယ် — data ဆုံးရှုံးမယ် |
| Plain `php artisan key:generate` (container ထဲ) | Image ထဲ `.env` မရှိ — error ဖြစ်မယ် |
| `composer install` (production container ထဲ) | vendor/ က image ထဲမှာ ပြီးသား — redundant |
| `npm run build` (production container ထဲ) | assets က image ထဲမှာ ပြီးသား — redundant |
| Config ထဲ objects/closures ထည့်ခြင်း | `php artisan optimize` serialize မရ — container fail |

### ✅ လုပ်ရမည့်အရာများ

| Rule | ဘာကြောင့် လုပ်ရသလဲ |
|---|---|
| `.env.production` ကို host server ပေါ်မှာသာ ထားခြင်း | Security — secrets image ထဲ မပါ |
| APP_KEY generate ပြီး `.env.production` ထဲထည့်ခြင်း | Laravel encryption အတွက် လိုအပ် |
| `make prod-down` သာ သုံးခြင်း | Database volume ကျန်တယ် |
| Regular DB backup လုပ်ခြင်း | Data loss ကာကွယ်ဖို့ |
| `docker builder prune -f` ပုံမှန် run ခြင်း | Disk space သုံးစွဲမှု လျှော့ချဖို့ |

---

## ၃၀. Quick Reference — အမြန်ရှာဖွေနည်း

### Local Development Commands

| Command | Description |
|---|---|
| `make up` | Container အားလုံး start |
| `make down` | Container အားလုံး stop (database ကျန်) |
| `make ps` | Container status ကြည့် |
| `make logs` | All logs tail |
| `make logs s=php` | PHP log သာ tail |
| `make shell` | PHP container ထဲ bash |
| `make migrate` | Migration run |
| `make wayfinder` | Typed routes regenerate |
| `make npm-install` | npm dependencies install |

### Production Commands

| Command | Description |
|---|---|
| `make prod-up` | Production stack start |
| `make prod-down` | Production stack stop (database ကျန်) |
| `make prod-ps` | Production status & health |
| `make prod-logs` | Production logs tail |
| `make prod-logs s=php` | PHP log သာ tail |
| `make prod-shell` | Production PHP container shell |
| `make prod-migrate` | Manual migration |
| `make prod-deploy` | Pull latest + recreate |
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

---

*ဒီစာတမ်းကို HTUT AI Backend project ရဲ့ Docker production deployment guide အဖြစ် မြန်မာဘာသာဖြင့် အဆင့်ဆင့် ရေးသားထားသည်။ ဖတ်သူသည် server အသစ်တစ်ခုမှာ application ကို zero ကနေ live ဖြစ်အောင် deploy နိုင်ရန် ရည်ရွယ်ထားသည်။*
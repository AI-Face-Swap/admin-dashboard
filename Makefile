# HTUT AI — Docker commands (local dev + production)
#
# Safe by default: `down` / `prod-down` never delete volumes (database survives).
# Only `fresh` is destructive — it asks for confirmation first.
#
# Production targets require .env.production on the machine (see DOCKER.md).

COMPOSE := docker compose
PROD := docker compose --env-file .env.production -f docker-compose.production.yml

.PHONY: help up down restart ps logs shell migrate fresh optimize-clear npm-install wayfinder tinker \
        prod-up prod-down prod-restart prod-ps prod-logs prod-shell prod-migrate prod-deploy prod-rollback

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Local development ────────────────────────────────────────────────────────

up: ## Start all services in the background
	$(COMPOSE) up -d

down: ## Stop all services (keeps mysql_data / redis_data / node_modules)
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

ps: ## Show service status and health
	$(COMPOSE) ps

logs: ## Tail logs from all services
	$(COMPOSE) logs -f --tail=100

shell: ## Bash into the php container
	$(COMPOSE) exec php bash

migrate: ## Run database migrations inside the php container
	$(COMPOSE) exec php php artisan migrate --force

fresh: ## DESTRUCTIVE — drop & re-create the database, then seed
	@echo "WARNING: this destroys ALL data in the htut-ai database."
	@read -p "Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || (echo "Aborted."; exit 1)
	$(COMPOSE) exec php php artisan migrate:fresh --seed --force

optimize-clear: ## Clear Laravel caches inside the php container
	$(COMPOSE) exec php php artisan optimize:clear

npm-install: ## Install/update frontend dependencies in the node container
	$(COMPOSE) exec node npm install --no-audit --no-fund --no-save

wayfinder: ## Regenerate Wayfinder typed routes (run after changing routes/controllers)
	$(COMPOSE) exec php php artisan wayfinder:generate --with-form

tinker: ## Laravel Tinker REPL
	$(COMPOSE) exec php php artisan tinker

# ── Production (run on the VPS, inside the repo) ────────────────────────────
# Requires .env.production — see DOCKER.md for one-time server setup.

prod-guard:
	@test -f .env.production || (echo "ERROR: .env.production not found. Run: cp .env.production.example .env.production  (then fill it in — see DOCKER.md)"; exit 1)

prod-up: prod-guard ## Start the production stack
	$(PROD) up -d

prod-down: prod-guard ## Stop the production stack (keeps volumes/database)
	$(PROD) down

prod-restart: prod-guard ## Restart the production stack
	$(PROD) restart

prod-ps: prod-guard ## Show production status and health
	$(PROD) ps

prod-logs: prod-guard ## Tail production logs (filter with: make prod-logs s=php)
	$(PROD) logs -f --tail=100 $(s)

prod-shell: prod-guard ## Bash into the production php container
	$(PROD) exec php bash

prod-migrate: prod-guard ## Run migrations in production (normally automatic on deploy)
	$(PROD) exec php php artisan migrate --force

prod-deploy: prod-guard ## Pull latest image and apply it (manual deploy on the server)
	$(PROD) pull && $(PROD) up -d --remove-orphans

prod-rollback: prod-guard ## Roll back to a previous build: make prod-rollback SHA=<short-sha>
	@test -n "$(SHA)" || (echo "Usage: make prod-rollback SHA=<short-sha>"; exit 1)
	IMAGE_TAG=$(SHA) $(PROD) up -d --remove-orphans

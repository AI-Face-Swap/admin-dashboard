# HTUT AI — local development with Docker
#
# Safe by default: `down` never deletes volumes (database survives).
# Only `fresh` is destructive — it asks for confirmation first.

COMPOSE := docker compose

.PHONY: help up down restart ps logs shell migrate fresh optimize-clear npm-install wayfinder tinker

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

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

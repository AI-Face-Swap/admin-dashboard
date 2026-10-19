# HTUT AI — Production Docker Commands
#
# Docker is used strictly for production deployment.
# Requires .env.production (see .env.production.example & DOCKER.md).
# Safe by default: `down` never deletes volumes (database & redis survive).

PROD := docker compose --env-file .env.production -f docker-compose.production.yml

.PHONY: help guard up down restart ps logs shell migrate \
        reverb-logs queue-logs scheduler-logs deploy rollback \
        prod-up prod-down prod-restart prod-ps prod-logs prod-shell prod-migrate prod-deploy prod-rollback

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

guard:
	@test -f .env.production || (echo "ERROR: .env.production not found. Run: cp .env.production.example .env.production (then fill it in)"; exit 1)

# ── Primary Production Commands ──────────────────────────────────────────────

up: guard ## Start all production services in the background (php, reverb, queue, scheduler, mysql, redis)
	$(PROD) up -d

down: guard ## Stop all services (keeps mysql_data, redis_data, and logs)
	$(PROD) down

restart: guard ## Restart all production services
	$(PROD) restart

ps: guard ## Show status and health of all containers
	$(PROD) ps

logs: guard ## Tail logs from all services (or specify s=<service>, e.g. make logs s=reverb)
	$(PROD) logs -f --tail=100 $(s)

reverb-logs: guard ## Tail logs from the Reverb WebSocket server
	$(PROD) logs -f --tail=100 reverb

queue-logs: guard ## Tail logs from the Redis Queue worker
	$(PROD) logs -f --tail=100 queue

scheduler-logs: guard ## Tail logs from the Cron scheduler
	$(PROD) logs -f --tail=100 scheduler

shell: guard ## Bash shell inside the php container
	$(PROD) exec php bash

migrate: guard ## Run database migrations inside the php container
	$(PROD) exec php php artisan migrate --force

deploy: guard ## Pull latest production image and apply zero-downtime rolling restart
	$(PROD) pull && $(PROD) up -d --remove-orphans

rollback: guard ## Roll back to a previous build SHA: make rollback SHA=<short-sha>
	@test -n "$(SHA)" || (echo "Usage: make rollback SHA=<short-sha>"; exit 1)
	IMAGE_TAG=$(SHA) $(PROD) up -d --remove-orphans

# ── Backwards-Compatible Aliases (prod-*) ─────────────────────────────────────

prod-guard: guard
prod-up: up
prod-down: down
prod-restart: restart
prod-ps: ps
prod-logs: logs
prod-shell: shell
prod-migrate: migrate
prod-deploy: deploy
prod-rollback: rollback

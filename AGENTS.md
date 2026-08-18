# HTUT AI — Admin Dashboard & AI Generation Platform

## Stack

- **Language / Runtime**: PHP 8.4
- **Framework**: Laravel 13 (Fortify for authentication, Passkeys, 2FA)
- **Frontend**: Inertia v3 + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui components
- **Package managers**: Composer (PHP) + npm / pnpm (JS)
- **Database**: SQLite (dev, `database/database.sqlite`), MySQL (production)
- **Testing**: Pest 4
- **Tooling**: Pint (PHP style), PHPStan/Larastan (static analysis), ESLint + Prettier (JS), Wayfinder (typed routes), Vite

## Project (memorize this)

Laravel admin dashboard + mobile-facing API for AI media generation (image generation, face swap, video face swap) via abstracted providers (Segmind, Replicate) with usage/cost tracking, an admin API testing playground, roles & permissions, and a theme system. Full product plan lives in `project-usecase.md` — read it before designing features.

Current state: clean Laravel + Inertia + React foundation with auth (login, register, passkeys, 2FA), settings pages (profile, security, appearance), welcome page, and a placeholder dashboard. Demo CRUD (categories, sub-categories, templates, exports) was removed. The admin dashboard design will be rebuilt later — do not invest in the current shell's visual design.

## Build approach

**Tracer bullet**: build thin, end-to-end slices through every layer (route → service → provider → DB → UI) for one feature at a time, then thicken. The admin dashboard and the mobile API must share the same core logic — never write two implementations of the same feature.

## Commands

```bash
# Install
composer install && npm install

# Dev (server + queue + logs + vite)
composer run dev

# Frontend build
npm run build

# Test (Pest)
php artisan test --compact

# PHP code style
vendor/bin/pint --dirty --format agent

# TypeScript check
npm run types:check

# PHP static analysis
composer run types:check
```

## Rules

- Follow Laravel conventions: `php artisan make:` for new files, Eloquent models with factories, named routes, feature tests.
- React pages live in `resources/js/pages`; reuse existing shadcn/ui components before writing new ones.
- Use TypeScript types and Wayfinder generated routes (`@/routes` / `@/actions`) — never hardcode URLs in components.
- Keep the API clean and versioned (`/api/v1/...`); do not write separate logic for admin vs mobile — reuse the same services.
- Provider integrations go behind an interface + factory (`app/AI/`), never hardcoded in controllers.
- Passwords / secrets come from `.env`, never committed.
- Run Pint + typecheck + the relevant tests before finishing any change.

## Workflow — every feature request (approval gated)

Follow this order for any coding request (e.g. "create the admin dashboard"):

1. **Write the prompt first.** Create `docs/prompts/<feature-slug>.md` describing: goal, requirements, affected files, acceptance criteria, open questions. Written in plain English.
2. **Stop and wait for approval.** Do NOT write code before the user accepts the prompt.
3. **On approval, write the code.** Smallest correct change, following existing conventions.
4. **Check & test.** Run the relevant tests (`php artisan test --compact`), `npm run types:check`, Pint, and `npm run build`.
5. **Auto-debug failures.** Find the root cause, fix it, re-run until green. Do not leave failing tests.
6. **Write the docs file.** Only when everything passes, create `docs/features/<feature-slug>.md`:
   - Beginner-friendly **English** by default (user may be new to the stack).
   - Include a **flowchart** (Mermaid ```` ```mermaid ```` block) of how the feature works.
   - Use **Myanmar (Burmese)** only when a concept is deep and hard to express simply in English.

## Agent skills (installed workflow)

This project uses the Engineering Workflow Skills (`jsmastery-pro/skills`) installed in `.agents/`. **Always read `.agents/docs/AGENTS.md` and `.agents/README.md` before significant work** to understand how each skill runs.

- [scope](.agents/skills/scope/): `jsmastery-pro/skills`, turns an idea into a coarse plan in `docs/scope/`
- [audit](.agents/skills/audit/): `jsmastery-pro/skills`, writes/updates this AGENTS.md from the real repo
- [architect](.agents/skills/architect/): `jsmastery-pro/skills`, makes load-bearing decisions as specs in `docs/specs/`
- [develop](.agents/skills/develop/): `jsmastery-pro/skills`, builds a feature from its spec
- [check](.agents/skills/check/): `jsmastery-pro/skills`, verifies a change in the running app or reviews it
- [test](.agents/skills/test/): `jsmastery-pro/skills`, writes the test suite for a change
- [document](.agents/skills/document/): `jsmastery-pro/skills`, writes PR/changelog/release docs from the real diff
- [sync](.agents/skills/sync/): `jsmastery-pro/skills`, keeps AGENTS.md / scope / specs current
- [debug](.agents/skills/debug/): `jsmastery-pro/skills`, root-cause loop for anything failing

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

## Free AI CLI usage (Claude Code with a free provider)

This repo's workflow (AGENTS.md + `.agents` skills) is tool-agnostic and works the same whether Claude Code is backed by the paid Anthropic API or a free/custom endpoint. To point Claude Code at a free or third-party provider, set these environment variables before launching it (values are provider-specific — the pattern below is what every Anthropic-compatible endpoint expects):

```bash
export ANTHROPIC_BASE_URL="https://<provider>/api/anthropic"   # provider's Anthropic-compatible base URL
export ANTHROPIC_AUTH_TOKEN="<provider-api-key>"               # or ANTHROPIC_API_KEY for key-based providers
export ANTHROPIC_MODEL="<model-name>"                          # e.g. a free-tier model the provider exposes
export ANTHROPIC_SMALL_FAST_MODEL="<small-fast-model>"         # for background/researcher subagents
```

Notes:

- Free-tier examples in the wild: OpenRouter's `:free` models, DeepSeek, or other Anthropic-compatible gateways — each provides its own base URL and key. Never commit these values; keep them in your shell profile or a local env file.
- The `.agents` skills spawn cheap "researcher"/"scout" subagents — the `ANTHROPIC_SMALL_FAST_MODEL` var controls what those use, so a small/free model keeps the cost near zero.
- Any behavior differences (rate limits, no vision, tool call quirks) come from the provider, not from this repo's workflow; the files-based handoff (AGENTS.md, docs/) means switching providers mid-feature loses nothing.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

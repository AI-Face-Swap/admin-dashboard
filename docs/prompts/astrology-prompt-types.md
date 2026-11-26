# Astrology Response Types (Short, Normal, Long) — Prompts & Point Costs

## Goal

Divide the Astrology AI chat system default prompt into three selectable types — **`short`**, **`normal`**, and **`long`** — each with its own tailored system prompt, output depth guidelines, and dynamic point cost:

| Type | Default Point Cost | Intended Depth |
|---|---|---|
| `short` | **3** points | Quick, concise reading (key insight + 1 section + 1–2 checklist items) |
| `normal` | **5** points | Balanced reading (overview + 2–3 sections + 2–4 checklist items) |
| `long` | **10** points | In-depth, comprehensive reading (detailed overview + 4–5 sections + 4–6 checklist items covering Mahabote, Zodiac, Nakhat, San-Yand-Nakhat, career/love/health/wealth, and remedies) |

## Requirements

1. **API Request Parameter (`POST /api/v1/chat/send`)**
   - Accept an optional `response_type` parameter in `SendChatMessageRequest`:
     - Validation: `['nullable', 'string', 'in:short,normal,long']`
     - Defaults to `'normal'` when `category === 'astrology'` and `response_type` is omitted (backward-compatible).
     - Ignored for non-astrology categories (`general`, `health`, `education`).

2. **Type-Specific System Prompts & Output Guidelines (`AstrologySkill` & `BaseChatSkill`)**
   - Update `ChatSkillInterface` / `BaseChatSkill` so `systemPrompt(string $language = 'my', ?string $responseType = null)` and `buildPrompt(string $userMessage, array $history = [], string $language = 'my', ?string $responseType = null)` support an optional `$responseType`.
   - In `AstrologySkill`:
     - Resolve the base system prompt for `short`, `normal`, or `long` (reading from `Setting::get('ai', "astrology_prompt_{$type}")` if configured by admin, otherwise falling back to distinct built-in default prompts for each type).
     - Override the JSON structure length guidelines per type:
       - `short`: 1–2 sentence overview, 1 concise section, 1–2 checklist items, under ~100 words.
       - `normal`: 2–3 sentence overview, 2–3 informative sections, 2–4 checklist items, under ~250 words.
       - `long`: 3–4 sentence overview, 4–5 detailed sections, 4–6 actionable checklist items, up to ~600 words.
   - In `AIChatService::buildModelPayload()`: adjust `max_tokens` for Qwen models when `response_type === 'long'` (e.g., `1500`) and `short` (e.g., `350`).

3. **Dynamic Point Cost Resolution (`short = 3`, `normal = 5`, `long = 10`)**
   - Add config defaults in `config/ai.php` (`point_costs` and `coin_costs`):
     - `astrology_short` = `3` (`AI_ASTROLOGY_SHORT_COST`)
     - `astrology_normal` = `5` (`AI_ASTROLOGY_NORMAL_COST`)
     - `astrology_long` = `10` (`AI_ASTROLOGY_LONG_COST`)
   - Add `AIChatService::resolvePointCost(string $category, ?string $responseType = null): int`:
     - When `category === 'astrology'`, returns the configured `Setting` / config cost for `short` (3), `normal` (5), or `long` (10).
     - For other categories, continues returning `point_cost_chat` (default `5`).
   - Use `resolvePointCost()` consistently in:
     - `AIChatController::send()` (balance check `402`, `spendPoints()`, JSON & SSE `points_deducted`, and metadata).
     - `AIChatService::chat()` and `streamChat()` (`AIGeneration.coins_spent` and `input_metadata['response_type']`).

4. **Public Point Costs API (`GET /api/v1/point-costs`)**
   - Update `PointCostController::index()` to include:
     - `astrology_short`, `astrology_normal`, `astrology_long`
     - `astrology`: `{ "short": 3, "normal": 5, "long": 10 }`
   - Keeps frontend aligned with backend settings without hardcoding prices.

5. **Admin Settings Management (`/admin/settings`)**
   - Allow admins (`settings.manage`) to view and update:
     - Astrology point costs: `astrology_short` (3), `astrology_normal` (5), `astrology_long` (10)
     - Astrology default system prompts for `short`, `normal`, and `long` (with built-in defaults pre-filled if not yet customized).

## Affected Files

- `config/ai.php`
- `app/AI/Skills/ChatSkillInterface.php`
- `app/AI/Skills/BaseChatSkill.php`
- `app/AI/Skills/AstrologySkill.php`
- `app/AI/Services/AIChatService.php`
- `app/Http/Requests/SendChatMessageRequest.php`
- `app/Http/Controllers/Api/AIChatController.php`
- `app/Http/Controllers/Api/PointCostController.php`
- `app/Http/Controllers/Admin/SettingController.php`
- `resources/js/pages/admin/settings/index.tsx`
- `tests/Feature/AIChatApiTest.php`

## Acceptance Criteria

- `POST /api/v1/chat/send` with `category=astrology` and `response_type=short` deducts **3** points, uses the short astrology system prompt, and records `coins_spent = 3`.
- `POST /api/v1/chat/send` with `category=astrology` and `response_type=normal` (or omitted) deducts **5** points, uses the normal astrology system prompt, and records `coins_spent = 5`.
- `POST /api/v1/chat/send` with `category=astrology` and `response_type=long` deducts **10** points, uses the long astrology system prompt, and records `coins_spent = 10`.
- Insufficient balance returns `402` with the exact `required_points` for the selected type (`3`, `5`, or `10`).
- `GET /api/v1/point-costs` returns the configured astrology tier costs.
- Admin settings page can update the astrology point costs and system prompts, taking effect immediately.
- Feature tests covering all three types, prompt differences, point deductions, `402` checks, and `GET /api/v1/point-costs` pass.

## Open Questions

1. **Request field name**:
   - **Recommended**: `response_type` (`short` | `normal` | `long`) on `POST /api/v1/chat/send` — clean and reusable if other chat categories add length tiers later. (Let me know if your frontend already expects a different key name like `type` or `astrology_type`.)

2. **Custom default prompt wording**:
   - **Recommended**: Ship well-crafted built-in English instructions (with automatic Myanmar/English output language rule) for `short`, `normal`, and `long` in `AstrologySkill`, AND expose them in `/admin/settings` so you can edit them anytime without a code deploy. (Or paste your exact custom wording for `short`, `normal`, and `long` now and I'll bake it directly in as the defaults.)

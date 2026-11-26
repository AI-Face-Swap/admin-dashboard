# Astrology Response Types (Short, Normal, Long)

## Overview

The Astrology AI chat skill (`category=astrology`) supports three response types — `short`, `normal`, and `long` — each with its own default system prompt, output structure/length guidelines, and point cost:

| Response Type | Default Point Cost | Output Depth |
|---|---|---|
| `short` | **3** points | 1–2 sentence highlight, 1 concise section, 1–2 checklist items (under 100 words) |
| `normal` (default) | **5** points | 2–3 sentence overview, 2–3 informative sections, 2–4 checklist items (under 250 words) |
| `long` | **10** points | 3–4 sentence overview, 4–5 comprehensive sections, 4–6 actionable checklist items (up to 600 words) |

## API Usage

### Send Astrology Chat Message

`POST /api/v1/chat/send`

```json
{
  "prompt": "ကျွန်ုပ်၏ ဒီလအတွက် ဗေဒင်ကို ဟောပေးပါ",
  "category": "astrology",
  "response_type": "long",
  "language": "my"
}
```

- `response_type`: optional, one of `short`, `normal`, `long`. Defaults to `normal` when `category` is `astrology`. Ignored for non-astrology categories.
- Returns `response_type` and `points_deducted` (`3`, `5`, or `10`) in both standard JSON responses and SSE `done` events.
- Returns HTTP `402` with `required_points` matching the selected type if the customer does not have enough points.

### Fetch Dynamic Point Costs

`GET /api/v1/point-costs`

Includes both flat keys and a nested object:

```json
{
  "astrology_short": 3,
  "astrology_normal": 5,
  "astrology_long": 10,
  "astrology": {
    "short": 3,
    "normal": 5,
    "long": 10
  }
}
```

## Admin Configuration

Admins with `settings.manage` permission can edit both the point costs (`point_cost_astrology_short`, `point_cost_astrology_normal`, `point_cost_astrology_long`) and the default system prompts (`astrology_prompt_short`, `astrology_prompt_normal`, `astrology_prompt_long`) under **`/admin/settings`**. Changes take effect immediately for new requests without redeployment.

## Key Files

- `config/ai.php` — default point costs (`astrology_short`, `astrology_normal`, `astrology_long`)
- `app/AI/Skills/AstrologySkill.php` — per-type default prompts, `Setting` overrides, and JSON format length guidelines
- `app/AI/Services/AIChatService.php` — `resolvePointCost()`, response-type prompt passing, Qwen `max_tokens` scaling, and `AIGeneration` tracking
- `app/Http/Requests/SendChatMessageRequest.php` — `response_type` validation
- `app/Http/Controllers/Api/AIChatController.php` — dynamic balance checks, point deduction, and response metadata
- `app/Http/Controllers/Api/PointCostController.php` — public point-costs exposure
- `app/Http/Controllers/Admin/SettingController.php` & `resources/js/pages/admin/settings/index.tsx` — admin management UI
- `tests/Feature/AIChatApiTest.php` — feature tests for prompts, point deductions, `402` checks, validation, and `/api/v1/point-costs`

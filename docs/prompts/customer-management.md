# Customer Management — Admin Dashboard

## Goal

Build admin pages for managing customers (mobile app / web app users). Customers register themselves via the API — the admin does NOT create or edit them. Admin can view, ban, and see their activity.

## What already exists

- **Model**: `app/Models/Customer.php` — fields: `id`, `name`, `email`, `password`, `avatar`, `auth_provider`, `auth_provider_id`, `customer_type` (free/premium), `coins`, `email_verified_at`, `last_active_at`, `created_at`
- **Permissions**: `customers.view`, `customers.manage` (already seeded)
- **API auth**: `CustomerAuthController` handles register/login/logout/me via Sanctum tokens
- **Generations**: `ai_generations` table has `customer_id` column

## What to add to Customer model

Add a `is_banned` boolean column (default false) via a new migration. Banned customers cannot authenticate via the API.

## Pages to build

### 1. Customer List (`/admin/customers`)

**Table columns:**
- Avatar (thumbnail) + Name
- Email
- Type badge (free / premium)
- 🪙 Coins
- Status badge (active / banned)
- Last active (relative time)
- Joined (date)
- Actions: View detail, Ban/Unban button

**Filters:**
- Search by name or email
- Filter by type (all / free / premium)
- Filter by status (all / active / banned)
- Filter by coin range: min input + max input

**Stats cards at top:**
- Total customers
- Free / Premium split
- Total coins in circulation
- Banned count

**Pagination:** 10 per page

### 2. Customer Detail (`/admin/customers/{customer}`)

**Top section — Profile card:**
- Avatar (large)
- Name, email
- Type badge (free / premium)
- Status badge (active / banned)
- 🪙 Coins balance
- Auth provider (google / apple / email)
- Email verified: ✅ or ❌
- Joined date, last active
- Ban/Unban button

**Middle section — Stats:**
- Total generations (count)
- Completed / Failed / Processing
- Total coins spent
- Total cost (USD)

**Bottom section — Recent generations table:**
- Same columns as AI page: Status, Operation, Template, Cost, Duration, Created
- Clickable rows → generation detail modal (reuse existing `GenerationDetailModal`)
- Paginated (20 per page)

**Placeholder section — Payment logs:**
- "Coin request payment logs coming soon" (for KBZ/Stripe integration later)

### 3. Ban / Unban

- Button on list page and detail page
- Confirmation dialog: "Ban this customer? They will not be able to login or make API requests."
- Unban dialog: "Unban this customer?"
- Toggles `is_banned` column
- Permission: `customers.manage`

## Files to create

| File | Purpose |
|---|---|
| `database/migrations/xxxx_add_is_banned_to_customers_table.php` | Add `is_banned` boolean column |
| `app/Http/Controllers/Admin/CustomerController.php` | Controller (index, show, ban, unban, destroy) |
| `resources/js/pages/admin/customers/index.tsx` | Customer list page |
| `resources/js/pages/admin/customers/show.tsx` | Customer detail page |
| `tests/Feature/AdminCustomerPagesTest.php` | Feature tests |

## Files to edit

| File | Change |
|---|---|
| `app/Models/Customer.php` | Add `is_banned` to fillable, add `scopeBanned()` |
| `routes/web.php` | Add customer routes in admin group |
| `resources/js/components/app-sidebar.tsx` | Add "Customers" link with `customers.view` permission |
| `app/Http/Middleware/` | Ban check: reject banned customers from API auth |

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/admin/customers` | GET | List customers |
| `/admin/customers/{customer}` | GET | Customer detail |
| `/admin/customers/{customer}/ban` | PATCH | Ban customer |
| `/admin/customers/{customer}/unban` | PATCH | Unban customer |
| `/admin/customers/{customer}` | DELETE | Delete customer |

### 4. Manual Coin Add (Developer role only)

**Where:** Customer detail page + customer list page (Actions column)

**How it works:**
- "Add Coins" button (only visible to users with `developer` role)
- Click → opens a small dialog/modal with:
  - Number input (how many coins to add)
  - Optional note/reason input (e.g. "Testing credit", "补偿")
  - Confirm button
- On confirm → adds coins to customer balance → shows success toast
- Logs the action (who added, how many, when, note) for audit trail

**Permission:** Only users with the `developer` role can see and use this action. Other admin roles (super_admin, admin, ai_manager, support, viewer) cannot.

**Why:** Developer role is for testing — need to give test accounts coins without going through the payment flow.

## Acceptance criteria

- [ ] Customer list with search, type filter, status filter, coin range filter
- [ ] Stats cards: total, free/premium, coins, banned
- [ ] Customer detail: profile, stats, recent generations (paginated)
- [ ] Ban/unban works from list and detail pages
- [ ] Banned customers cannot authenticate via API
- [ ] Manual coin add: dialog with amount + note, only visible to developer role
- [ ] Permission-gated: `customers.view` to see, `customers.manage` to ban/unban/delete
- [ ] Sidebar link for `customers.view`
- [ ] All tests pass
- [ ] Pint + ESLint clean

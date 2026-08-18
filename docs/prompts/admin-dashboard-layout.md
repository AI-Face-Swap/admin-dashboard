# New Admin Dashboard Layout (animated)

## Goal

Rebuild the admin dashboard shell and dashboard page with the project's own identity, using the animated shadcn/ui wrappers (AnimatedButton, AnimatedCard) as the interaction layer. This is Phase 1 (Admin layout + Theme system) and the first slice of Phase 2 (Dashboard + Admin navigation) from `project-usecase.md`.

## Requirements

1. **Admin navigation** — restructure the sidebar into the project's real sections (per `project-usecase.md`):
   - Dashboard
   - AI (Generate / History)
   - Providers
   - Users
   - Roles & Permissions
   - API Playground
   - Settings
   - Placeholder links (AI, Providers, Users, Roles, API Playground) can point to a simple "coming soon" placeholder page — no real features yet.
2. **Redesigned dashboard page** (`/dashboard`) — replace the starter-kit placeholder with the project's real dashboard skeleton:
   - Stat cards: Today's Cost, Total Generations, Face Swaps, Video Generations (placeholder values, using `AnimatedCard`)
   - A recent generations / activity placeholder section
   - Uses `AnimatedButton` for any actions
3. **Animated shell** — keep the existing sidebar layout structure (SidebarProvider, SidebarInset) but polish it with the project's identity (logo, colors via theme variables, motion transitions already in `app-layout.tsx` stay).
4. **No hardcoded colors** — everything uses the existing CSS theme variables (already defined in `resources/css/app.css`).
5. **Do not touch auth/settings pages** — only the shell + dashboard page + nav.

## Affected files

- `resources/js/components/app-sidebar.tsx` — new nav structure
- `resources/js/components/nav-main.tsx` — nav rendering (reuse)
- `resources/js/pages/dashboard.tsx` — redesigned dashboard
- `resources/js/pages/coming-soon.tsx` — new placeholder page (or inline in dashboard)
- `resources/js/components/admin/` — new folder for dashboard-specific components (stat card, section card)
- Possibly `resources/js/types/navigation.ts` — nav types if needed

## Acceptance criteria

- [ ] Sidebar shows the real admin sections with active state per current URL
- [ ] Dashboard renders stat cards with entrance animation (AnimatedCard) and themed colors
- [ ] Placeholder pages render without errors for all new nav links
- [ ] `npm run types:check` passes
- [ ] `php artisan test --compact` passes (existing auth tests unaffected)
- [ ] `npm run build` passes

## Open questions

1. **Placeholder pages**: create one shared "Coming Soon" page for all not-yet-built sections, or individual stub pages per section? (recommended: one shared Coming Soon page — lighter)
2. **Stat card values**: show zero/example values now, or pull real numbers from the DB later when AI generation exists? (recommended: static example values now, real data wired in Phase 4+)
3. **Scope**: keep this slice to shell + dashboard + placeholder, or also build the Users/Roles pages in this pass? (recommended: shell + dashboard only, sections come with their features)

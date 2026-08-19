# API Request Logs + Generation Detail

## Goal

Two features:
1. **API Request Logs page** (`/admin/api-logs`) — browse/search all logged API requests
2. **Generation Detail modal** — click a generation in the AI page's recent list to see full details including output files

## Requirements

### 1. API Request Logs Page

- Route: `/admin/api-logs` — permission: `settings.manage`
- Paginated table (50 per page) with columns: Method, Path, Status, Duration, Requester, Time
- Filters: method dropdown, status code, path search
- Click a row → expand/collapse to show:
  - Request headers (collapsible JSON)
  - Request body (JSON formatted)
  - Response headers (collapsible JSON)
  - Response body (JSON formatted)
- Color-coded status/method badges

### 2. Generation Detail Modal (on AI page)

- Click a row in "Recent generations" → opens a dialog
- Shows: status, operation, template, cost, duration, request_id
- **Output files**: images as `<img>`, videos as `<video>` player
- Input metadata + raw response (collapsible JSON)
- Error message if failed

## Files

- `app/Http/Controllers/Admin/APIRequestLogController.php` (new)
- `resources/js/pages/admin/api-logs/index.tsx` (new)
- `resources/js/pages/admin/ai/index.tsx` (add clickable rows + dialog)
- `routes/web.php`, `resources/js/components/app-sidebar.tsx`
- `tests/Feature/AdminAPILogsPageTest.php` (new)

## Acceptance criteria

- [ ] `/admin/api-logs` loads with paginated logs + filters
- [ ] Row expand shows request/response details
- [ ] Generation detail modal shows output files (images + videos)
- [ ] Guest → redirect; no permission → 403
- [ ] Tests pass

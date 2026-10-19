# HTUT AI — Visual Architecture Documentation (.drawio)

This directory contains 5 editable, native Draw.io (`.drawio`) diagrams visualizing the asynchronous AI generation architecture, SSE streaming, point safety guarantees, and real-time broadcasting.

## How to Open & Edit
1. **Web Browser**: Visit [app.diagrams.net](https://app.diagrams.net) and choose **Open Existing Diagram**, then select any `.drawio` file below.
2. **VS Code**: Install the official **Draw.io Integration** extension (`hediet.vscode-drawio`) to edit and view these files directly inside your editor.

---

## Diagram Catalog

| File | Diagram Name | Description & Key Topics |
|---|---|---|
| [`01-system-overview.drawio`](./01-system-overview.drawio) | **System Overview** | Complete end-to-end architecture: React 19 Frontend SPA, NGINX Ingress (`X-Accel-Buffering: no`), Laravel 12 API Controllers, Redis 7 Queue & Cache, Central Auth Identity & Points Ledger, MariaDB, Laravel Reverb WebSockets, and External AI Providers (Segmind & OpenAI). |
| [`02-ai-generation-flow.drawio`](./02-ai-generation-flow.drawio) | **AI Generation Lifecycle Flow** | 100% Unified Asynchronous Queue pipeline for all 5 AI generation endpoints (Text-to-Image, Image Edit, Photo Face Swap, Video Face Swap, Image-to-Video). Shows FormRequest validation (no async parameter), `AIIdempotencyService` token checks, upfront Central Auth S2S point deduction, immediate HTTP 202 Accepted response, Redis queue dispatch, background worker execution, Segmind AI cluster processing, S3 Spaces asset uploads, Reverb WebSocket broadcasting, and exact-once refund execution on failure. |
| [`03-chat-sse-flow.drawio`](./03-chat-sse-flow.drawio) | **Chat SSE Streaming Sequence** | Sequence diagram tracing React UI `fetch()` with `ReadableStream` through NGINX, `AIChatController@send`, `AIChatService@streamChat`, and external LLM provider. Visualizes progressive chunk emission (`start`, `chunk`, `done`, `[DONE]`), output buffer flushing, assistant message persistence, point deduction, and backward-compatible non-streaming fallback. |
| [`04-points-refund-safety.drawio`](./04-points-refund-safety.drawio) | **Points, Idempotency & Refund Safety** | Deep-dive into financial safety and ledger integrity: `client_idempotency_token` lookup, HTTP 409 Conflict on payload mismatch, Central Auth composite unique constraint `[project_id, reference_id, type]`, submission state transitions (`submitting` → `submitted` → `unreconciled`), pessimistic locking in `refundPointsOnce()`, and analysis of worker crash/retry scenarios. |
| [`05-reverb-websocket-flow.drawio`](./05-reverb-websocket-flow.drawio) | **Reverb WebSockets & Real-Time Broadcasting** | Lifecycle events dispatching `AIGenerationUpdated` (`ShouldBroadcastNow`) to private channels (`generation.{id}`, `customer.{id}`). Documents Reverb server setup, channel authorization guards in `routes/channels.php`, the pending frontend Laravel Echo integration contract, and the active HTTP polling fallback. |

---

## Implementation & Verification Status

- **Backend Architecture & APIs**: Fully implemented and verified with 45 passing automated backend tests and 170 Central Auth tests.
- **Frontend Streaming (`chat.service.ts`)**: Supports streaming readable streams.
- **Frontend Real-Time Broadcasting**: Currently running via active **HTTP Polling fallback** (`GET /api/v1/ai/generations/{id}`). Direct **Laravel Echo / Pusher WebSockets** integration is clearly documented in `05-reverb-websocket-flow.drawio` as **PENDING FRONTEND INTEGRATION**.

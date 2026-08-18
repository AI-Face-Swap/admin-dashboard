# AI Platform — High-Level Architecture

## 1. System overview

```mermaid
flowchart TB
    subgraph Clients
        CUST[Customers<br/>Mobile App + Web App]
        AD[Admin Dashboard<br/>Inertia + React]
    end

    CUST -->|HTTPS / JSON| API[Laravel REST API<br/>/api/v1/*]
    AD --> WEB[Laravel Web<br/>/admin/*]

    API --> CTRL[Controllers / Form Requests]
    WEB --> CTRL

    CTRL --> SVC[AI Service<br/>Generate Image · Face Swap · Video Face Swap]
    SVC --> FACT[AI Provider Factory]
    FACT --> SEG[Segmind Provider]
    FACT --> REP[Replicate Provider]
    SEG --> SEGAPI[(Segmind API)]
    REP --> REPAPI[(Replicate API)]

    SVC --> NORM[Normalize Provider Response]
    NORM --> DB[(MySQL / PostgreSQL)]
    DB --> COST[Usage / Cost Tracking]
    DB --> HIST[Generation History]
    DB --> TEMPLATES[(Templates<br/>categories · tags)]

    subgraph Shared Infrastructure
        Q[Queue / Jobs] --> R[(Redis + Horizon)]
        DB
        FS[File / Object Storage<br/>Input Images · Template Files · Outputs · Videos]
    end
```

## 2. Main flow — Mobile App

```mermaid
sequenceDiagram
    participant Mobile as Mobile App
    participant Laravel as Laravel API
    participant AI as AI Service
    participant Factory as AI Provider Factory
    participant Provider as Segmind / Replicate
    participant DB as Database

    Mobile->>Laravel: POST /api/v1/ai/images
    Laravel->>AI: delegate request
    AI->>Factory: resolve provider
    Factory->>Provider: call provider API
    Provider-->>AI: raw response
    AI->>AI: normalize response
    AI->>DB: save usage + cost + generation history
    AI-->>Laravel: normalized result
    Laravel-->>Mobile: JSON response
```

## 3. Face swap flow — customer + template

```mermaid
flowchart LR
    CUSTOMER[Customer] -->|uploads face photo| API[POST /api/v1/ai/face-swap]
    API --> TEMPLATE[(Pick template<br/>superhero · football · anime)]
    TEMPLATE --> SVC[AI Service]
    SVC --> FACT[Provider Factory]
    FACT --> SEG[Segmind Model]
    SEG --> OUT[Customer's face on template photo]

    style OUT fill:#d3f9d8,stroke:#2b8a3e
```

The customer picks a template (Superman, football player, anime character, ...) and uploads their own face. The output is their face on that template. Templates support **image and video** files and are looked up by **slug**, never by id.

## 4. Admin API Playground — same endpoints, no duplicate logic

```mermaid
flowchart LR
    Admin[Admin Dashboard] --> Play[API Playground]
    Play -->|POST /api/v1/ai/images| API[Same Laravel API]
    API --> SVC[Same AI Service]
    SVC --> FACT[Same Provider Factory]
    FACT --> SEG[Segmind / Replicate]

    style Play fill:#ffe8cc,stroke:#f76707
```

**Rule:** the Admin Playground is a Postman-like client for the mobile API. It calls the exact same endpoints — never write separate AI-generation logic for it.

## 5. AI Provider architecture

```mermaid
flowchart TB
    CTRL[Controller] --> SVC[AI Service]
    SVC --> FACT[AIProviderFactory]
    FACT --> INT[AIProviderInterface]
    INT --> SEG[SegmindProvider]
    INT --> REP[ReplicateProvider]
    INT --> FUT[FutureProvider]

    style INT fill:#e3fafc,stroke:#0c8599
```

- Controllers must **never** call Segmind/Replicate directly.
- Every provider implements the common `AIProviderInterface`.
- Provider responses are normalized into one internal format (`AIResponse` DTO).
- Adding a new provider must not require rewriting business logic.

## 6. Admin dashboard modules

```mermaid
flowchart LR
    ADMIN[/admin/]
    ADMIN --> DASH[dashboard]
    ADMIN --> AI[ai]
    AI --> IMG[image-generation]
    AI --> FS[face-swap]
    AI --> VFS[video-face-swap]
    AI --> GEN[generations]
    ADMIN --> TEMPLATES[templates]
    TEMPLATES --> T_CAT[categories CRUD]
    TEMPLATES --> T_LIST[template CRUD]
    TEMPLATES --> T_TAGS[tags CRUD]
    ADMIN --> PROV[providers]
    PROV --> PSEG[segmind]
    PROV --> PREP[replicate]
    PROV --> PUSE[usage]
    ADMIN --> PLAY[api-playground]
    ADMIN --> USERS[users - admins]
    ADMIN --> CUST[customers]<br/>free / premium
    ADMIN --> ROLES[roles]
    ADMIN --> PERMS[permissions]
    ADMIN --> ANAL[analytics]
    ANAL --> AUSE[usage]
    ANAL --> ACST[costs]
    ADMIN --> SET[settings]
    SET --> THEME[theme]
```

## 7. Frontend structure

```mermaid
flowchart TB
    LARAVEL[Laravel] --> INERTIA[Inertia]
    INERTIA --> REACT[React + TypeScript]
    REACT --> PAGES[Pages]
    REACT --> LAYOUTS[Layouts]
    REACT --> COMP[Components]
    REACT --> UI[UI Components<br/>shadcn/ui]
    REACT --> THEME[Theme System<br/>global CSS variables]

    style THEME fill:#d3f9d8,stroke:#2b8a3e
```

**Theme rule:** global CSS variables control every design token.

```css
:root {
    --primary: ...;
    --primary-foreground: ...;
    --background: ...;
    --foreground: ...;
    --card: ...;
    --border: ...;
}
```

## 8. Authentication & authorization

```mermaid
flowchart LR
    Admin[Admin] --> Auth[Authentication]
    Auth --> Role[Role]
    Role --> Perms[Permissions]
    Perms --> Actions[Allowed Admin Actions]

    style Perms fill:#fff3bf,stroke:#e67700
```

Example permissions:

| Permission | Meaning |
|---|---|
| `dashboard.view` | View dashboard |
| `ai.generate` | Run AI generations |
| `ai.view` | View generation history |
| `providers.view` / `providers.manage` | View / manage providers |
| `api.playground` | Use the API playground |
| `users.view` / `users.manage` | View / manage users |
| `roles.view` / `roles.manage` | View / manage roles |
| `settings.manage` | Manage settings |

## 9. Development order

```mermaid
flowchart TB
    P1[Phase 1 — Foundation<br/>Laravel · Inertia · React+TS · Tailwind · shadcn · Auth · Admin layout]
    P2[Phase 2 — Admin Core<br/>Roles · Permissions · Users · Dashboard · Theme system]
    P3[Phase 3 — AI Architecture<br/>AIProviderInterface · Factory · AI Service · Segmind · DTO · Usage/Cost]
    P4[Phase 4 — Image Generation<br/>API · Generation History · Admin UI]
    P5[Phase 5 — Face Swap + Video Face Swap]
    P6[Phase 6 — Replicate + more providers]
    P7[Phase 7 — API Playground + logs]
    P8[Phase 8 — Analytics · Queue · Redis · Horizon]
    P9[Phase 9 — Animation · Polish · Performance · Tests]

    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> P9
```

## 10. Important architecture rules

1. Admin Playground and Mobile App **must** use the same API endpoints.
2. Controllers must not directly call Segmind or Replicate.
3. All providers implement a common provider contract.
4. Provider-specific responses are normalized into an internal response format.
5. Provider usage and cost are persisted.
6. Provider API keys are **never** exposed to React or the Mobile App.
7. Authorization is enforced on the Laravel backend (React only knows permissions for UI show/hide).
8. Theme colors are controlled through global CSS variables.
9. Long-running AI operations use queues/jobs where appropriate.
10. Adding a new AI provider must not rewrite existing business logic.
11. Customers (mobile + web end users) and admins (dashboard) share the same AI services and providers — never two implementations.
12. Templates are looked up by **slug** (indexed), never by id; free customers get a limited generation quota enforced in the API.

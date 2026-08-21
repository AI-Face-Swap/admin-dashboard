# Customer Frontend UI Redesign — Full Prompt

## Overview

Complete redesign of the customer-facing React SPA (`frontend/`) to create a modern, polished AI media generation platform. The current UI is basic and functional — this redesign transforms it into a premium, app-like experience inspired by modern AI tools (Banani, Midjourney, Leonardo AI).

**Reference design:** Banani AI (`app.banani.co`) — clean cards, gradient backgrounds, smooth transitions, category-based browsing, generation history.

---

## Design Principles

1. **Mobile-first responsive** — works beautifully on phone, tablet, desktop
2. **Dark-mode by default** with light mode toggle (the theme CSS already supports both)
3. **Card-based layout** — every feature gets a visual card with hover effects
4. **Smooth animations** — Framer Motion for page transitions, card entrances, loading states
5. **Glass morphism** — subtle backdrop-blur effects on headers, cards, overlays
6. **Gradient accents** — use primary color gradients for CTAs and highlights
7. **Consistent spacing** — use Tailwind's spacing scale, no arbitrary values

---

## Pages to Build / Redesign

### 1. Home Page (`/`) — COMPLETE REDESIGN

**Current:** Basic hero + 3 feature cards + template grid + CTA
**New:** Immersive landing experience

```
┌─────────────────────────────────────────────────┐
│  [Header: Logo | nav links | coins | login]      │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │         SLIDER CAROUSEL (existing)           │ │
│  │    Auto-rotate, dots, arrows, gradient       │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │          HERO SECTION (redesigned)           │ │
│  │                                               │ │
│  │  "Create Amazing AI Content"                 │ │
│  │  "Face swap, image generation, video —       │ │
│  │   all powered by cutting-edge AI"            │ │
│  │                                               │ │
│  │  [✨ Try Now]  [Browse Templates]            │ │
│  │                                               │ │
│  │  Stats: 1K+ generations | 500+ users         │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌───── QUICK ACTION CARDS (3 cols) ──────────┐ │
│  │                                               │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │ │
│  │  │ 🖼️ Image │ │ 🔄 Face  │ │ 🎬 Video │    │ │
│  │  │ Generate │ │  Swap    │ │   Swap   │    │ │
│  │  │          │ │          │ │          │    │ │
│  │  │ 5 coins  │ │ 5 coins  │ │ 20 coins │    │ │
│  │  └──────────┘ └──────────┘ └──────────┘    │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌───── FEATURED TEMPLATES (horizontal scroll) ┐ │
│  │                                               │ │
│  │  [Card] [Card] [Card] [Card] [Card] →       │ │
│  │  Each: thumbnail + name + cost + type badge  │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌───── CATEGORIES (pill buttons) ─────────────┐ │
│  │  [All] [Superhero] [Football] [Anime] [More]│ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌───── HOW IT WORKS (3 steps) ────────────────┐ │
│  │  1. Choose Template → 2. Upload Face →       │ │
│  │  3. Get Result                                │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  [Footer]                                         │
└─────────────────────────────────────────────────┘
```

**Components needed:**
- `HeroSection` — gradient background, animated text, CTA buttons
- `QuickActionCards` — 3 cards with icons, costs, hover effects
- `FeaturedTemplates` — horizontal scroll carousel (not grid)
- `CategoryPills` — horizontal scroll pill buttons
- `HowItWorks` — 3-step visual guide with icons

---

### 2. Text to Image Page (`/generate`) — NEW PAGE

**The main new feature.** A dedicated page for text-to-image generation.

```
┌─────────────────────────────────────────────────┐
│  [Header]                                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─── LEFT PANEL (Input) ──────────────────────┐ │
│  │                                               │ │
│  │  "AI Image Generator"                        │ │
│  │                                               │ │
│  │  ┌─ Prompt Input ─────────────────────────┐  │ │
│  │  │ Describe what you want to create...     │  │ │
│  │  │                                         │  │ │
│  │  │ [textarea, 4 rows, expandable]          │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌─ Model Select ─────────────────────────┐  │ │
│  │  │ [Seedream 5.0 Lite ▾]                  │  │ │
│  │  │  • seedream-v5-lite (fast, default)     │  │ │
│  │  │  • nano-banana-2-lite (Google fastest)  │  │ │
│  │  │  • qwen-image-3 (best text in image)    │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌─ Size ─────────────────────────────────┐  │ │
│  │  │ [1024 × 1024 ▾]  [Square] [Portrait]   │  │ │
│  │  │ Preset: Square(1024), Portrait(768x1024)│  │ │
│  │  │          Landscape(1024x768)             │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌─ Negative Prompt (optional) ───────────┐  │ │
│  │  │ Things to avoid...                      │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  Cost: 5 coins                               │ │
│  │  Your balance: 85 coins                      │ │
│  │                                               │ │
│  │  [✨ Generate Image]                         │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── RIGHT PANEL (Result) ────────────────────┐ │
│  │                                               │ │
│  │  ┌─ Empty State ──────────────────────────┐  │ │
│  │  │  ✨                                      │  │ │
│  │  │  Your generated image will appear here  │  │ │
│  │  │  Enter a prompt and click Generate      │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌─ Loading State ────────────────────────┐  │ │
│  │  │  [animated spinner/pulse]               │  │ │
│  │  │  "Generating your image..."             │  │ │
│  │  │  "This usually takes 5-10 seconds"      │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌─ Result State ─────────────────────────┐  │ │
│  │  │  [Generated Image]                      │  │ │
│  │  │                                         │  │ │
│  │  │  [Download] [Regenerate] [Share]        │  │ │
│  │  │                                         │  │ │
│  │  │  Model: seedream-v5-lite                │  │ │
│  │  │  Size: 1024×1024                        │  │ │
│  │  │  Time: 3.2s                             │  │ │
│  │  │  Cost: 5 coins                          │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Key features:**
- Split layout: input on left, result on right (stacked on mobile)
- Real-time generation with polling (2s interval)
- Prompt suggestions/Presets (optional — can add later)
- Download button on completed generation
- Regenerate button to try again
- Shows cost before generating
- Negative prompt collapsible section

---

### 3. Templates Page (`/templates`) — REDESIGN

**Current:** Basic grid with search + category filters
**New:** Visual category browsing + masonry-style grid

```
┌─────────────────────────────────────────────────┐
│  [Header]                                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  "Templates"                                     │
│  "Choose a template and create something amazing"│
│                                                   │
│  ┌─ Search Bar ────────────────────────────────┐ │
│  │  🔍 Search templates...                     │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Category Tabs (horizontal scroll) ─────────┐ │
│  │  [All] [Superhero] [Football] [Anime]       │ │
│  │  [Celebrity] [Movie] [Custom]               │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Type Filter ──────────────────────────────┐ │
│  │  [All] [🖼️ Image] [🎬 Video]              │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Templates Grid ───────────────────────────┐ │
│  │                                               │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │ │
│  │  │  🖼️    │ │  🎬    │ │  🖼️    │          │ │
│  │  │        │ │  ▶     │ │        │          │ │
│  │  │ Name   │ │ Name   │ │ Name   │          │ │
│  │  │ 5 coins│ │ 20 coin│ │ 5 coins│          │ │
│  │  └────────┘ └────────┘ └────────┘          │ │
│  │                                               │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │ │
│  │  │  🎬    │ │  🖼️    │ │  🖼️    │          │ │
│  │  │  ▶     │ │        │ │        │          │ │
│  │  │ Name   │ │ Name   │ │ Name   │          │ │
│  │  │ 20 coin│ │ 5 coins│ │ 5 coins│          │ │
│  │  └────────┘ └────────┘ └────────┘          │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  [Load More / Pagination]                        │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Improvements:**
- Category tabs with horizontal scroll (not wrapping buttons)
- Video templates show a play icon overlay
- Hover effect: scale up slightly + shadow
- Lazy load images
- Skeleton loading state
- Empty state with illustration

---

### 4. Template Detail Page (`/templates/$slug`) — REDESIGN

```
┌─────────────────────────────────────────────────┐
│  [Header]                                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  [← Back to Templates]                          │
│                                                   │
│  ┌─── LEFT: Preview ──────────────────────────┐ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────┐    │ │
│  │  │                                       │    │ │
│  │  │         TEMPLATE IMAGE/VIDEO          │    │ │
│  │  │         (large, full width)           │    │ │
│  │  │                                       │    │ │
│  │  └─────────────────────────────────────┘    │ │
│  │                                               │ │
│  │  Category: Superhero                         │ │
│  │  Tags: [hero] [marvel] [action]             │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── RIGHT: Actions ─────────────────────────┐ │
│  │                                               │ │
│  │  Template Name                               │ │
│  │  "Swap your face onto this template"         │ │
│  │                                               │ │
│  │  Cost: 🪙 5 coins                            │ │
│  │  Your balance: 85 coins                      │ │
│  │                                               │ │
│  │  ┌─ Upload Face ─────────────────────────┐  │ │
│  │  │  ┌─────────────────────────────────┐  │  │ │
│  │  │  │     📷 Drop image here          │  │  │ │
│  │  │  │     or click to browse          │  │  │ │
│  │  │  └─────────────────────────────────┘  │  │ │
│  │  │                                         │ │ │
│  │  │  [Preview of uploaded face]            │  │ │
│  │  └─────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  [✨ Generate Image (5 coins)]               │ │
│  │  OR                                          │ │
│  │  [🎬 Generate Video (20 coins)]              │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── SIMILAR TEMPLATES ──────────────────────┐ │
│  │  [Card] [Card] [Card] [Card]               │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Improvements:**
- Drag & drop upload zone (not just a button)
- Face preview after upload
- Separate buttons for image vs video generation
- Similar templates section at bottom
- Share button (copy link)

---

### 5. Generation Result Page (`/generations/$id`) — REDESIGN

```
┌─────────────────────────────────────────────────┐
│  [Header]                                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  [← Back]                                        │
│                                                   │
│  ┌─── Result Display ─────────────────────────┐ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────┐    │ │
│  │  │                                       │    │ │
│  │  │      GENERATED IMAGE / VIDEO         │    │ │
│  │  │      (large, centered)               │    │ │
│  │  │                                       │    │ │
│  │  └─────────────────────────────────────┘    │ │
│  │                                               │ │
│  │  ┌─ Action Bar ─────────────────────────┐   │ │
│  │  │  [Download] [Share] [Regenerate]     │   │ │
│  │  └───────────────────────────────────────┘   │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── Details Card ───────────────────────────┐ │
│  │                                               │ │
│  │  Operation: Face Swap                        │ │
│  │  Provider: Segmind                           │ │
│  │  Duration: 3.2s                              │ │
│  │  Cost: 5 coins                               │ │
│  │  Status: ✅ Completed                        │ │
│  │  Created: Aug 21, 2026 10:30 AM             │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── Processing State ───────────────────────┐ │
│  │                                               │ │
│  │  [Animated processing indicator]             │ │
│  │  "Your image is being generated..."          │ │
│  │  "This usually takes 5-10 seconds"           │ │
│  │                                               │ │
│  │  Progress: ████████░░ 80%                    │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─── FAILED State ───────────────────────────┐ │
│  │                                               │ │
│  │  ❌ Generation Failed                        │ │
│  │  "The output image may contain sensitive     │ │
│  │   information"                               │ │
│  │                                               │ │
│  │  [Try Again]                                 │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

### 6. Dashboard Page (`/dashboard`) — REDESIGN

```
┌─────────────────────────────────────────────────┐
│  [Header]                                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  "Welcome back, John! 👋"                        │
│  "You have 85 coins remaining"                   │
│                                                   │
│  ┌─ Stats Row ─────────────────────────────────┐ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │ │
│  │  │ 🪙   │ │ 🖼️   │ │ 🔄   │ │ 🎬   │      │ │
│  │  │ 85   │ │ 12   │ │ 8    │ │ 4    │      │ │
│  │  │coins │ │images│ │swaps │ │videos│      │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Quick Actions ─────────────────────────────┐ │
│  │                                               │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │ │
│  │  │ ✨       │ │ 🖼️       │ │ 🔄       │    │ │
│  │  │ Text to  │ │ Face     │ │ Video    │    │ │
│  │  │ Image    │ │ Swap     │ │ Swap     │    │ │
│  │  │ 5 coins  │ │ 5 coins  │ │ 20 coins │    │ │
│  │  └──────────┘ └──────────┘ └──────────┘    │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Recent Generations ────────────────────────┐ │
│  │                                               │ │
│  │  [img] Face Swap — 3m ago — ✅ — 5 coins    │ │
│  │  [img] Image Gen — 1h ago — ✅ — 5 coins    │ │
│  │  [vid] Video Swap — 3h ago — ⏳ — 20 coins  │ │
│  │                                               │ │
│  │  [View All →]                                │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

### 7. Generation History Page (`/history`) — NEW PAGE

```
┌─────────────────────────────────────────────────┐
│  [Header]                                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  "Generation History"                            │
│  "All your AI creations in one place"            │ │
│                                                   │
│  ┌─ Filters ───────────────────────────────────┐ │
│  │  [All] [✅ Completed] [⏳ Processing] [❌ Failed]│
│  │  [All Types] [Image] [Face Swap] [Video]    │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ History Grid ─────────────────────────────┐ │
│  │                                               │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │ │
│  │  │ [img]  │ │ [img]  │ │ [vid]  │          │ │
│  │  │ ✅     │ │ ✅     │ │ ⏳     │          │ │
│  │  │ Face   │ │ Image  │ │ Video  │          │ │
│  │  │ Swap   │ │ Gen    │ │ Swap   │          │ │
│  │  │ 3m ago │ │ 1h ago │ │ 3h ago │          │ │
│  │  │ 5 coins│ │ 5 coins│ │20 coins│          │ │
│  │  └────────┘ └────────┘ └────────┘          │ │
│  │                                               │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │ │
│  │  │ [img]  │ │ [img]  │ │ [vid]  │          │ │
│  │  │ ✅     │ │ ❌     │ │ ✅     │          │ │
│  │  │ Face   │ │ Image  │ │ Video  │          │ │
│  │  │ Swap   │ │ Gen    │ │ Swap   │          │ │
│  │  │ 1d ago │ │ 1d ago │ │ 2d ago │          │ │
│  │  │ 5 coins│ │ 5 coins│ │20 coins│          │ │
│  │  └────────┘ └────────┘ └────────┘          │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  [Load More]                                     │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Key features:**
- Grid view (not list) — show output thumbnail
- Status badges on each card
- Filter by status + type
- Click to view detail (`/generations/$id`)
- Infinite scroll or "Load More" button

---

### 8. Header — REDESIGN

```
┌─────────────────────────────────────────────────┐
│  🎨 HTUT AI    Templates  Generate  History     │
│                                                   │
│              [🪙 85]  [👤 John ▾]               │
│                           ├─ Dashboard           │
│                           ├─ Settings            │
│                           └─ Logout              │
└─────────────────────────────────────────────────┘
```

**Changes:**
- Add "Generate" link (goes to `/generate`)
- Add "History" link (goes to `/history`)
- User dropdown menu (avatar + name + dropdown)
- Mobile: hamburger menu with slide-out drawer

---

### 9. Footer — REDESIGN

Simple, clean footer with:
- Logo + copyright
- Links: Privacy, Terms, Contact
- Social icons (placeholder)
- "Powered by HTUT AI"

---

## Component Architecture

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── main-layout.tsx        (update: mobile menu)
│   │   ├── header.tsx             (redesign)
│   │   ├── footer.tsx             (redesign)
│   │   └── mobile-nav.tsx         (NEW: mobile slide-out menu)
│   ├── home/
│   │   ├── hero-section.tsx       (NEW)
│   │   ├── quick-actions.tsx      (NEW)
│   │   ├── featured-templates.tsx (NEW: horizontal scroll)
│   │   ├── category-pills.tsx     (NEW)
│   │   └── how-it-works.tsx       (NEW)
│   ├── generate/
│   │   ├── prompt-input.tsx       (NEW: textarea + model select)
│   │   ├── size-selector.tsx      (NEW: preset size buttons)
│   │   ├── result-panel.tsx       (NEW: empty/loading/result states)
│   │   └── generation-card.tsx    (NEW: for history grid)
│   ├── templates/
│   │   ├── template-card.tsx      (NEW: reusable card component)
│   │   ├── template-grid.tsx      (NEW: grid with skeleton loading)
│   │   └── category-tabs.tsx      (NEW: horizontal scroll tabs)
│   ├── ui/                        (existing shadcn components)
│   └── animated/                  (existing framer-motion wrappers)
├── pages/
│   ├── home.tsx                   (redesign)
│   ├── generate.tsx               (NEW: text-to-image page)
│   ├── templates.tsx              (redesign)
│   ├── template-detail.tsx        (redesign)
│   ├── generations/
│   │   ├── $id.tsx                (redesign: generation detail)
│   │   └── index.tsx              (NEW: generation history)
│   ├── dashboard.tsx              (redesign)
│   ├── login.tsx                  (keep as-is, minor polish)
│   └── register.tsx               (keep as-is, minor polish)
├── hooks/
│   ├── use-generations.ts         (NEW: list user's generations)
│   ├── use-templates.ts           (update: add sorting)
│   └── use-ai.ts                  (update: add image generation)
└── types/
    └── index.ts                   (update: add missing types)
```

---

## Animation Specifications

### Page Transitions
```tsx
// Wrap each page in motion.div
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### Card Entrances
```tsx
// Staggered card animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.1 }}
>
```

### Hover Effects
```tsx
// Card hover scale
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
```

### Loading States
- Skeleton screens with pulse animation
- Spinner for generation processing
- Progress bar for video generation

---

## Color Theme

The theme CSS already supports light/dark mode. Use these for accents:

| Element | Light | Dark |
|---|---|---|
| Primary CTA | `bg-primary` | `bg-primary` |
| Gradient | `from-primary to-purple-600` | `from-primary to-purple-500` |
| Success | `text-green-500` | `text-green-400` |
| Warning | `text-yellow-500` | `text-yellow-400` |
| Error | `text-destructive` | `text-destructive` |
| Muted | `bg-muted` | `bg-muted` |

---

## API Integration

### New API Endpoints Needed

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /api/v1/customer/generations` | GET | List customer's generations (paginated) |
| `GET /api/v1/customer/stats` | GET | Customer stats (total generations, by type) |

### Existing Endpoints Used

| Endpoint | Used By |
|---|---|
| `GET /api/v1/sliders` | Home page carousel |
| `GET /api/v1/templates` | Templates page, Home featured |
| `GET /api/v1/templates/{slug}` | Template detail |
| `GET /api/v1/template-categories` | Category filters |
| `POST /api/v1/auth/login` | Login page |
| `POST /api/v1/auth/register` | Register page |
| `GET /api/v1/auth/me` | Auth context |
| `POST /api/v1/ai/face-swap` | Template detail |
| `POST /api/v1/ai/video-face-swap` | Template detail |
| `POST /api/v1/ai/images` | Generate page |
| `GET /api/v1/ai/generations/{id}` | Generation detail |

---

## File Structure Summary

### New Files to Create
```
frontend/src/components/home/hero-section.tsx
frontend/src/components/home/quick-actions.tsx
frontend/src/components/home/featured-templates.tsx
frontend/src/components/home/category-pills.tsx
frontend/src/components/home/how-it-works.tsx
frontend/src/components/generate/prompt-input.tsx
frontend/src/components/generate/size-selector.tsx
frontend/src/components/generate/result-panel.tsx
frontend/src/components/generate/generation-card.tsx
frontend/src/components/templates/template-card.tsx
frontend/src/components/templates/template-grid.tsx
frontend/src/components/templates/category-tabs.tsx
frontend/src/components/layout/mobile-nav.tsx
frontend/src/pages/generate.tsx
frontend/src/pages/generations/index.tsx
frontend/src/hooks/use-generations.ts
```

### Files to Update
```
frontend/src/App.tsx                    (add new routes)
frontend/src/pages/home.tsx             (redesign)
frontend/src/pages/templates.tsx        (redesign)
frontend/src/pages/template-detail.tsx  (redesign)
frontend/src/pages/dashboard.tsx        (redesign)
frontend/src/pages/generation-detail.tsx (redesign)
frontend/src/components/layout/header.tsx (redesign)
frontend/src/components/layout/footer.tsx (redesign)
frontend/src/components/layout/main-layout.tsx (add mobile menu)
frontend/src/hooks/use-ai.ts            (add image generation)
frontend/src/hooks/use-templates.ts     (add sorting)
frontend/src/types/index.ts             (add missing types)
```

---

## Acceptance Criteria

1. ✅ Home page has slider carousel, hero, quick actions, featured templates, categories, how-it-works
2. ✅ Text to Image page has prompt input, model select, size selector, generate button, result display
3. ✅ Templates page has category tabs, search, type filter, visual grid with thumbnails
4. ✅ Template detail has drag-and-drop upload, face preview, separate image/video buttons
5. ✅ Generation detail shows result with download, processing animation, error states
6. ✅ Dashboard shows stats, quick actions, recent generations
7. ✅ History page shows all generations in grid with filters
8. ✅ Header has navigation, coins display, user dropdown
9. ✅ Mobile responsive with hamburger menu
10. ✅ Dark mode works correctly
11. ✅ Framer Motion animations on page transitions and cards
12. ✅ All pages load within 2 seconds
13. ✅ TypeScript compiles without errors
14. ✅ ESLint passes without errors
15. ✅ Build succeeds

---

## Implementation Order

1. **Phase 1: Layout** — Header redesign + mobile nav + footer
2. **Phase 2: Home** — Hero, quick actions, featured templates, categories
3. **Phase 3: Generate** — Text-to-image page (new)
4. **Phase 4: Templates** — Grid redesign, category tabs, template detail
5. **Phase 5: History** — Generation history page (new) + detail page
6. **Phase 6: Dashboard** — Stats, quick actions, recent generations
7. **Phase 7: Polish** — Animations, loading states, error handling, dark mode

---

## Notes

- All new API endpoints need backend controllers before frontend can consume them
- The `GET /api/v1/customer/generations` endpoint needs to be created in Laravel
- The `GET /api/v1/customer/stats` endpoint needs to be created in Laravel
- Existing pages (login, register) need minimal changes — just polish
- The frontend uses TanStack Router — new routes must be added to `App.tsx`
- All components should be in TypeScript with proper types
- Use existing shadcn/ui components before creating new ones
- Use existing `animated/` components for Framer Motion wrappers

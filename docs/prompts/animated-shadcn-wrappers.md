# Animated shadcn/ui wrappers (framer-motion layer)

## Goal

Establish a project-wide animation convention: every shadcn/ui component gets a framer-motion wrapper, so pages use e.g. `AnimatedButton` instead of the raw shadcn `Button`. Pattern:

```
Button → AnimatedButton (framer-motion) → shadcn/ui Button
```

This matches the plan in `project-usecase.md` (item 13: choose Motion/framer-motion first; light animations only — page transition, sidebar, modal, card entrance, loading, hover, list transition).

## Requirements

1. Recreate `resources/js/lib/animations.ts` with reusable motion variants (`fadeIn`, `slideUp`, `scaleIn`, `springConfig`, `tweenConfig`).
2. Recreate `resources/js/components/animated/` with framer-motion wrappers that **reuse the existing shadcn/ui components**:
   - `AnimatedButton` → wraps `ui/button` (whileTap + whileHover scale, spring transition)
   - `AnimatedCard` → wraps `ui/card` (card entrance animation)
   - `AnimatedInput` → wraps `ui/input` (focus/entrance animation)
   - `AnimatedTextarea` → wraps `ui/textarea` (entrance animation)
3. Wrappers must accept the exact same props as the underlying shadcn component (`ComponentProps<typeof Button>` etc.) and pass everything through — drop-in replacement, no API break.
4. The wrapper is a `motion.div` (or motion element) around the shadcn component — never restyle or duplicate the shadcn component itself.
5. No hardcoded colors; all styling stays in the shadcn component + theme variables.

## Affected files

- `resources/js/lib/animations.ts` (recreate)
- `resources/js/components/animated/AnimatedButton.tsx` (recreate)
- `resources/js/components/animated/AnimatedCard.tsx` (recreate)
- `resources/js/components/animated/AnimatedInput.tsx` (recreate)
- `resources/js/components/animated/AnimatedTextarea.tsx` (recreate)

No changes to existing pages unless approved — this is the foundation layer only.

## Acceptance criteria

- [ ] `AnimatedButton` renders a shadcn `Button` inside a motion wrapper with hover/tap feedback
- [ ] All wrappers pass through props (variants, sizes, `asChild`, etc.) identically to the shadcn originals
- [ ] `npm run types:check` passes
- [ ] `npm run build` passes

## Open questions

1. Should we also wrap `Dialog` / `Sheet` / `Sidebar` now (for modal/sidebar transitions), or keep this first slice to the four above and add more per-feature later? (recommended: four first, add per-feature)
2. After the layer is built, should we swap the existing auth/settings pages to use `AnimatedButton` as a demo, or leave pages untouched? (recommended: leave pages, swap when rebuilding the admin UI)

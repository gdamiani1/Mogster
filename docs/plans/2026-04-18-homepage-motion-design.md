# Mogster homepage motion pass — design

**Date:** 2026-04-18
**Scope:** `web/` — homepage only
**Direction:** post-brutalist / neo-Y2K, single viewport, CSS-only motion

## Problem

The homepage looks intentional but static — every element is a rectangle sitting where it was placed. Lighthouse gives it 97/100/100/100 but it reads as "landing page template with a yellow background" at first glance. We want visitors to feel the "AURA MEASUREMENT STATION" bit within the first second.

## Non-goals

- Changing content structure (still single-viewport, form-first)
- New dependencies (Framer Motion, GSAP, Lottie)
- Changes to metadata, JSON-LD, fonts, or SEO
- Touching `privacy`/`terms` pages

## The 4 moves

### 1. Marquee hazard stripe ticker

Replace the top static `HazardStripe label="⚠ AURA MEASUREMENT STATION ⚠"` with a scrolling marquee. Loops this sequence right→left at ~40s/cycle:

```
⚠ AURA MEASUREMENT STATION ⚠ CALIBRATING ⚠ SIGMA DETECTED ⚠ NO CAP VERIFIED ⚠ MOG LEVEL CRITICAL ⚠
```

Diagonal-stripe background is preserved. Inner content is a duplicated flex row translated via `@keyframes`. Bottom stripe (the thin divider before the footer) stays static — keeps the "frame" feel.

### 2. Ambient aura-score readouts

Six fixed-position diagnostic chips drifting in the background layer (behind grain, above yellow):

| Text | Initial position | Drift | Duration |
|---|---|---|---|
| `AURA: 984` | top-left-ish | translate(+120px, +80px) | 140s |
| `SIGMA CHK: OK` | top-right-ish | translate(-140px, +60px) | 180s |
| `MOG %: 97.3` | mid-left | translate(+180px, -100px) | 110s |
| `VIBE: ULTRA` | mid-right | translate(-100px, +140px) | 160s |
| `COPE: LOW` | bottom-left | translate(+160px, -80px) | 130s |
| `DRIP: MAX` | bottom-right | translate(-180px, -60px) | 150s |

Each: monospace, 11px, 1px solid ink border, 0.35 opacity, `pointer-events: none`, `aria-hidden="true"`. Infinite `alternate` direction so they wobble back and forth rather than teleporting.

Flicker effect on the last digit of numeric readouts: `AURA:`, `MOG %:`. Three stacked `<span>`s with different final digits, cycling via staggered opacity animations (1.8s period, offset).

### 3. Cursor-follow aura blob

Desktop only. A 200px radial gradient (hazard-yellow core → transparent at 70%) with `mix-blend-mode: difference` that lags the cursor by ~120ms. Implementation:

- Client component, mounts a `<div>` with `position: fixed`, `pointer-events: none`, `z-index: 5` (above grain, below interactive content)
- Single `pointermove` listener updates a CSS variable `--x/--y`; blob `transform: translate(calc(var(--x) - 100px), calc(var(--y) - 100px))`
- Uses `transition: transform 120ms ease-out` for the lag (no rAF needed — transition handles it)
- Hidden on touch/coarse-pointer devices via `@media (hover: hover) and (pointer: fine)`
- Hidden by default (`opacity: 0`), fades in on first `pointermove`
- Skipped entirely under `prefers-reduced-motion: reduce`

### 4. Glitch-settle wordmark entrance

On first paint, `MOGSTER` wordmark animates over ~1.2s:

- **0–600ms:** RGB-split with `::before` (cyan, `translate(-6px, 0)`) and `::after` (magenta, `translate(+6px, 0)`), `skew(-2deg)` jitter stepping every 80ms
- **600–1000ms:** offsets tween to 0, jitter decays
- **1000–1200ms:** tiny bounce (`scale(1.02) → 1`)

Implemented as a modified `Wordmark` component with `data-glitch` attribute that triggers the animation via CSS. The primary `MOGSTER` text is rendered at its final position from 0ms (LCP-safe) — the glitch layers are decorative `::before`/`::after` that additively overlay. Single run per page load (no loop).

## Component changes

### New

- **`web/components/MarqueeStripe.tsx`** — replaces `HazardStripe` at top of homepage. Props: `items: string[]`. Renders diagonal-stripe bg + scrolling content.
- **`web/components/AuraBlob.tsx`** — client component. Cursor-follow blob.
- **`web/components/AuraReadouts.tsx`** — server component. Six drifting chips.
- **`web/components/GlitchWordmark.tsx`** — new (replaces `Wordmark` on homepage). Keeps `size` prop API.

### Edited

- **`web/app/page.tsx`** — swap top `HazardStripe label=` → `MarqueeStripe items=`; swap `Wordmark` → `GlitchWordmark`; add `<AuraReadouts />` + `<AuraBlob />` inside `<main>`.
- **`web/app/globals.css`** — new `@keyframes`: `marquee-scroll`, `aura-drift-{1..6}`, `flicker-cycle`, `glitch-rgb-split`, `glitch-jitter`; global `@media (prefers-reduced-motion: reduce)` rule killing all of them.

### Untouched

`WaitlistForm`, `GrainOverlay`, `HazardStripe` (still used at the bottom), `layout.tsx`, footer, metadata, JSON-LD, fonts, `robots.ts`, `sitemap.ts`, privacy/terms pages.

## Accessibility

- **`prefers-reduced-motion: reduce`** — kills marquee scroll, drift, glitch, and cursor-follow. Marquee content becomes static (first item only). Wordmark renders without glitch layers.
- **Aura readouts:** `aria-hidden="true"` — they're decorative. Not in the a11y tree.
- **Marquee:** `role="marquee"` with `aria-label="Aura measurement station: calibrating"`. Screen readers announce it once, don't loop the content.
- **Blob:** `aria-hidden="true"`, `pointer-events: none` — no interaction.
- **Keyboard nav:** unchanged. No new focusable elements.
- **h1:** unchanged. Still single `<h1>` with "YOUR AURA. RATED. NO CAP."

## Performance

Budget: must hold Lighthouse 97/100/100/100 scores on mobile.

- All animated properties are `transform` and `opacity` (compositor-only, no layout/paint cost).
- No JS runs on scroll.
- Cursor-follow: single `pointermove` listener writing two CSS vars per event (throttled by the browser's native event coalescing).
- No new dependencies → no bundle delta.
- Marquee/drift are paused via `animation-play-state: paused` on tabs that are backgrounded (future optimization, not P1).
- LCP element (`MOGSTER` span) is painted at its final position from frame 1; the glitch layers fade in additively and don't retrigger LCP.

## SEO

Zero changes. h1, title, description, JSON-LD, canonical, OG, robots, sitemap — all untouched.

## Verification plan

1. `preview_start mogster-web`, inspect at 375×812 (mobile) and 1280×800 (desktop)
2. `preview_snapshot` — confirm h1, form, footer all intact; no new focusable elements in the tree
3. `preview_console_logs level: error` — should be empty
4. Emulate `prefers-reduced-motion: reduce` via `preview_eval` + check all motion stops
5. `preview_screenshot` before/after at both viewports
6. `npm test` (vitest) — WaitlistForm tests still pass
7. `npx tsc --noEmit` — clean
8. `npm run lint` — no new errors (baseline: 4 pre-existing errors)

## Rollout

Single commit on `master` after verification. No feature flag — this is a pre-launch marketing site with near-zero traffic.

## Estimated work

45–60 minutes of implementation. Zero new dependencies.

# HexDI Shared Design System

All 18 inspirations share a unified design language. This document captures every token, pattern, and convention that appears across files.

---

## Color Tokens

| Token          | Value     | Usage                                |
| -------------- | --------- | ------------------------------------ |
| `bg`           | `#020408` | Page background                      |
| `surface`      | `#08101C` | Card/panel surfaces                  |
| `primary`      | `#00F0FF` | Cyan — borders, accents, links, glow |
| `primaryLight` | `#5FFFFF` | Lighter cyan for gradients           |
| `primaryDark`  | `#008F99` | Darker cyan for hover states         |
| `accent`       | `#FF5E00` | Orange — CTAs, warnings, highlights  |
| `accentDark`   | `#CC4A00` | Darker orange                        |
| `text`         | `#DAE6F0` | Body text                            |
| `muted`        | `#586E85` | Secondary/subdued text               |

### Variant overrides

- **file 5 & 6**: `bg: #010306`, `surface: #050a14`, `muted: #4a5d71`
- **file 6**: adds `accent: #FF0055` (red-pink) and `neonPurple: #BC13FE`

---

## Typography

| Role                      | Font family | Weights            |
| ------------------------- | ----------- | ------------------ |
| `font-sans` / body        | Inter       | 300, 400, 500, 600 |
| `font-display` / headings | Rajdhani    | 400, 500, 600, 700 |
| `font-mono` / code/labels | Fira Code   | 400, 500, 600      |

**Text size scale (headings)**

- Hero h1: `text-5xl md:text-7xl` → `text-6xl md:text-8xl` (files 3–4 go bigger)
- Section h2: `text-3xl md:text-4xl`
- Card h3: `text-xl`–`text-2xl`
- Labels: `text-[9px]`–`text-xs`, `tracking-[0.2em]–[0.5em]`, `uppercase`

**Text style patterns**

- ALL CAPS headings: `uppercase tracking-widest`
- Monospace inline labels: `font-mono text-[10px] tracking-[0.2em] uppercase`
- Gradient heading: `text-transparent bg-clip-text bg-gradient-to-r from-hex-primary to-hex-primaryLight`
- Glitch effect (file 5): `textShadow: '2px 0 0 #FF5E00, -2px 0 0 #00F0FF'`
- Chromatic aberration (file 6): oscillating shadow between `#FF0055` and `#00F0FF`

---

## Background Patterns

### Grid

```css
/* Standard 40px grid */
background-size: 40px 40px;
background-image:
  linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px);

/* Large 160px grid (files 3, 11, 12) */
background-size: 160px 160px;
opacity: 1.5px lines, 0.08 opacity

/* Minimal 60px grid (file 8) */
background-size: 60px 60px;
opacity: 0.02
```

### Radial spotlight / radar

```css
/* Primary spotlight */
radial-gradient(circle at center, rgba(0, 240, 255, 0.08–0.15) 0%, rgba(2, 4, 8, 0) 70%)

/* Accent spotlight */
radial-gradient(circle at center, rgba(255, 94, 0, 0.1) 0%, rgba(2, 4, 8, 0) 70%)
```

### Hex tessellation (file 6 only)

```css
/* SVG hex tile as inline data URI, animated slow scroll */
animation: hex-pattern 120s linear infinite;
```

### Scrolling grid mask (file 5)

```css
mask-image: radial-gradient(circle at center, black, transparent 80%);
```

---

## Core Component Patterns

### `.hud-card`

The primary card pattern used across all files.

```css
background: rgba(8, 16, 28, 0.4–0.7);
backdrop-filter: blur(4px–12px);
border: 1px solid rgba(0, 240, 255, 0.10–0.20);
position: relative;
transition: all 0.3s–0.4s ease / cubic-bezier(0.16, 1, 0.3, 1);

/* Corner bracket pseudo-elements */
::before — top-left: width/height 10–15px, border-top+left 2px #00F0FF
::after  — bottom-right: width/height 10–15px, border-bottom+right 2px #00F0FF

/* Hover state */
background: rgba(0, 240, 255, 0.05–0.08);
border-color: rgba(0, 240, 255, 0.4–0.6);
box-shadow: 0 0 20px rgba(0, 240, 255, 0.10–0.15);

/* Hover corner expansion (files 1–3) */
::before/::after width/height → 100% (full frame bracket) at opacity 0.5
/* Or to fixed 30px (file 3) / color changes to #5FFFFF */
```

**Hover lift variant (file 4 / 3):**

```css
transform: translateY(-5px) scale(1.02);
box-shadow: 0 10px 30px rgba(0, 240, 255, 0.15);
```

### `.clip-path-slant`

CTA button shape — diagonal right edge:

```css
/* common */
clip-path: polygon(0 0, 100% 0, 90–95% 100%, 0% 100%);
```

### `.holo-element`

Shimmer/holographic sheen overlay:

```css
::after {
  background: linear-gradient(
    115deg,
    transparent 0%,
    transparent 40%,
    rgba(0, 240, 255, 0.2) 50%,
    transparent 60%,
    transparent 100%
  );
  background-size: 300% 100%;
  animation: holo-slide 3–4s infinite linear;
}
@keyframes holo-slide {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

### `.tactical-border-b` (nav)

```css
border-bottom: 1px solid rgba(0, 240, 255, 0.2–0.3);
box-shadow: 0 4px 20–30px -10px rgba(0, 240, 255, 0.4–0.5);
```

---

## Animations

| Name             | Duration       | Description                                          |
| ---------------- | -------------- | ---------------------------------------------------- |
| `float`          | 6s ease-in-out | Vertical bob with optional 3D rotation (`rotateX/Z`) |
| `pulse-glow`     | 2s             | Opacity 0.4→1 + box-shadow glow pulse                |
| `scanline`       | 4s–8s linear   | Vertical scan line sweeps top to bottom              |
| `holo-slide`     | 3s             | Background-position drift for shimmer                |
| `spin-slow`      | 20–30s         | Full rotation                                        |
| `fade-up`        | 1s             | Opacity 0→1 + translateY 40→0 (file 4)               |
| `particle-float` | 15s            | Rising particles (file 4)                            |
| `glitch`         | 1s             | Text-shadow RGB split (file 5)                       |
| `chroma`         | 2–3s           | Chromatic aberration oscillation (file 6)            |

---

## Syntax Highlighting (code blocks)

```css
.token.keyword    → #FF5E00  (orange)
.token.function   → #00F0FF  (cyan)
.token.string     → #A6E22E  (green)
.token.class-name → #F92672  (pink/magenta)
.token.comment    → #586E85 italic
```

---

## Scrollbar

```css
::-webkit-scrollbar {
  width: 4–6px;
}
::-webkit-scrollbar-track {
  background: #020408;
}
::-webkit-scrollbar-thumb {
  background: #00f0ff or rgba(0, 240, 255, 0.2);
}
```

---

## Logo / Icon

Hexagon SVG with inner circle and dot. Hex path: `M12 2L21 7V17L12 22L3 17V7L12 2Z`.
Inner dot: `<circle cx="12" cy="12" r="3" fill="currentColor" />`.
Always colored `text-hex-primary` with drop-shadow glow `drop-shadow-[0_0_8–12px_rgba(0,240,255,0.8–1)]`.

**Logo text:** `Hex` (white) + `DI` (`text-hex-primary`), `font-display font-bold text-2xl tracking-widest uppercase`.

---

## Status Badge

```html
<div
  class="flex items-center gap-2 text-[10px] text-hex-primary border border-hex-primary/30 px-2–3 py-1 bg-hex-primary/5 font-mono uppercase"
>
  <div class="w-1.5 h-1.5 bg-hex-primary rounded-full animate-pulse/ping"></div>
  SYS.ONLINE
</div>
```

---

## HUD Corner Brackets (container decoration)

4-corner brackets on panels/sections:

```css
/* Each corner: position absolute, border on 2 sides, width/height 4–32px */
top-left:     border-t + border-l  →  #00F0FF, 2–4px
top-right:    border-t + border-r
bottom-left:  border-b + border-l
bottom-right: border-b + border-r
/* Hover expansion: transition width/height to 16px or 30px */
```

---

## Section Scanline Overlay

```css
.section-scanline {
  position: absolute;
  inset: 0;
  height: 100px;
  background: linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.05), transparent);
  pointer-events: none;
  z-index: 5;
  animation: scanline 6s linear infinite;
}
```

---

## Fixed HUD Telemetry Labels

Side panels displayed at `xl:` breakpoint only, `pointer-events: none`:

```html
<!-- Left side -->
<div
  class="fixed top-24 left-6 text-[9–10px] text-hex-primary/50 uppercase tracking-widest font-mono hidden xl:block ..."
>
  Build: Stable / v2.4.0
</div>
<!-- Right side -->
<div class="fixed top-24 right-6 ... text-right">System: Rigid / Scope: Global</div>
```

---

## Install Command Widget

```html
<div
  class="flex items-center gap-3 p-4 bg-[#050A10] border border-hex-primary/20 max-w-md font-mono text-sm relative"
>
  <span class="text-hex-accent">$</span>
  <span class="text-gray-400">npm install</span>
  <span class="text-hex-primary">@hex-di/core</span>
  <button class="ml-auto ..."><!-- copy icon --></button>
</div>
```

---

## Code Window

```html
<div class="border border-hex-primary/30 bg-[#020408] rounded-sm overflow-hidden">
  <!-- header bar -->
  <div
    class="px-4 py-2 bg-[#0A1420] border-b border-hex-primary/30 flex items-center justify-between"
  >
    <!-- macOS traffic lights (files 3+) -->
    <div class="flex gap-1.5">
      <div class="w-3 h-3 rounded-full bg-red-500/50"></div>
      <div class="w-3 h-3 rounded-full bg-yellow-500/50"></div>
      <div class="w-3 h-3 rounded-full bg-green-500/50"></div>
      <span class="text-[10px] text-hex-muted uppercase font-mono ml-4">TERMINAL_01</span>
    </div>
    <span class="text-xs text-hex-primary font-mono">app.container.ts</span>
  </div>
  <!-- code body with scanline overlay -->
  <pre class="p-6 font-mono text-sm leading-relaxed">...</pre>
  <!-- progress bar at bottom -->
  <div class="h-1 bg-hex-primary/20 w-full">
    <div class="h-full w-1/4–2/3 bg-hex-primary shadow-[0_0_10px_#00F0FF] animate-pulse"></div>
  </div>
</div>
```

---

## Dependency Graph SVG (hero visual)

A hexagon outline with 6 nodes (`CONTAINER`, `SERVICE`, `REPO`, `DB`, `ADAPTER`, `PORT`) connected with gradient paths. Center has a radial glow + crosshair. Animated with `float` and periodic `pulse`. Used in hero section right column.

---

## Module Architecture SVG

4-node diagram: `CORE` (center, lit), `GRAPH` (top), `RUNTIME` (bottom), `REACT` (left), `TESTING` (right — orange). Arrows labeled VALIDATES, EXECUTES, INTEGRATES, MOCKS. Animated moving dots along paths.

---

## Comparison Block Pattern

Side-by-side cards: "Legacy Protocol" (red border, `RUNTIME_ERR` badge) vs "HexDI Protocol" (cyan border, `COMPILE_OK` badge).

```
Red side:   border-red-500/50  bg-red-900/5   text-red-500
Cyan side:  border-hex-primary/50  bg-hex-primary/5  text-hex-primary
```

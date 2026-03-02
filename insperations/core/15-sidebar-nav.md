# 15 — Landing Page (Sidebar Navigation)

**File:** `15.html`
**Title:** HexDI - Structural Dependency Injection
**Type:** Marketing landing page
**Layout:** Fixed left sidebar nav + scrollable main content

---

![Screenshot](./screenshots/15.png)

## Overview

A distinctive layout variant with a **fixed left sidebar** replacing the top navigation bar. The body uses `display: flex` and the `aside` is fixed at `w-64` with a `tactical-border-r` (right-side glow border). Main content scrolls to the right of the sidebar. Uses `bg-grid-large` (160px), `holo-element`, and `section-scanline` overlays. The hero is a full-width `hud-card` spanning `col-span-12`.

---

## Color Palette

Standard HexDI palette. No overrides.

---

## Root Layout

```css
body {
  display: flex; /* sidebar + content side by side */
  background: #020408;
  overflow-x: hidden;
}

/* Fixed overlays */
.fixed-grid-bg {
  /* bg-grid-large, opacity: 0.30 */
}
.fixed-vignette {
  /* radial-gradient(circle at 50% 50%, transparent 0%, rgba(2,4,8,0.8) 100%) */
}
```

---

## Left Sidebar (`aside`, fixed, w-64)

```html
<aside
  class="fixed left-0 top-0 bottom-0 w-64 z-[100] tactical-border-r bg-hex-bg/90 backdrop-blur-xl flex flex-col p-8"
></aside>
```

### Logo Block (top of sidebar)

```html
<div class="flex items-center gap-3 group cursor-pointer mb-16">
  <!-- hex SVG: hover rotates 90deg over 500ms -->
  <!-- bg-hex-primary/20 blur-xl animate-pulse glow behind icon -->
  <span class="font-display font-bold text-2xl tracking-widest">HexDI</span>
</div>
```

Logo icon hover: `group-hover:rotate-90 transition-transform duration-500`
Ambient glow: `absolute inset-0 bg-hex-primary/20 blur-xl rounded-full scale-150 animate-pulse`

### Nav Links (sidebar)

```html
<nav
  class="flex flex-col gap-8 text-[11px] font-mono tracking-[0.2em] text-hex-muted uppercase flex-grow"
>
  <a href="#features" class="relative group py-2">
    <span class="group-hover:text-hex-primary">[01_Features]</span>
    <!-- animated underline: w-0 → w-full on hover (0.3s) -->
    <span
      class="absolute bottom-0 left-0 w-0 h-[1px] bg-hex-primary transition-all duration-300 group-hover:w-full"
    ></span>
  </a>
  <!-- [02_Architecture], [03_Lifecycle], [04_Code], [05_Compare] -->
</nav>
```

Numbered links: `[01_Features]`, `[02_Architecture]`, `[03_Lifecycle]`, `[04_Code]`, `[05_Compare]`

### `.tactical-border-r`

```css
.tactical-border-r {
  border-right: 1px solid rgba(0, 240, 255, 0.2);
  box-shadow: 4px 0 30px -10px rgba(0, 240, 255, 0.2);
}
```

---

## Main Content (to the right of sidebar, `ml-64`)

Background layers:

1. Fixed `bg-grid-large` (160px, opacity 0.30) — full viewport
2. Fixed radial vignette (dark edges)
3. `holo-element` shimmer overlays on sections

### Hero (`hud-card`, full-width with bg-radar-gradient)

The hero is a large `hud-card` spanning full width, height `min-h-[500px]`, using `flex flex-col lg:flex-row`:

```
┌────────────────────────────────────────────────────────┐
│ bg-radar-gradient (radial cyan overlay)                │
│ top edge: 1px animated gradient line (pulse)           │
│                                                        │
│  Left side (flex-1):                │  Right side:     │
│  Orange badge (STABLE_PROTOCOL)     │  Hexagon SVG     │
│  h1 text-5xl md:text-7xl UPPERCASE  │  animate-float   │
│  "COMPILE_TIME"                     │  (rotateX(20deg) │
│  "STRUCTURAL" (cyan glow)           │   rotateZ(-10deg))│
│  "INTEGRITY."                       │                  │
│  Mono subtext (left border accent)  │                  │
│  [Initialize_Core] [View_Docs]      │                  │
└────────────────────────────────────────────────────────┘
```

Top edge accent: `absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-hex-primary to-transparent animate-pulse`

### Feature Cards (CSS Grid 12-col)

```html
<div class="md:col-span-4 hud-card p-6">
  <!-- icon box: border border-hex-primary/20 bg-hex-primary/5 w-fit -->
  <!-- h3: font-display font-bold text-xl uppercase tracking-widest -->
  <!-- p: text-xs font-mono leading-relaxed -->
</div>
```

3 cards per row at `md:` breakpoint (each `col-span-4`).

---

## Full Layout Diagram

```
┌────────┬───────────────────────────────────────────────┐
│ ASIDE  │  MAIN (scrollable)                            │
│ fixed  │                                               │
│ w-64   │  ┌─ HERO hud-card (full-width, min-h-500) ─┐ │
│        │  │ text left + hex SVG right                │ │
│ Logo   │  └─────────────────────────────────────────┘ │
│        │                                               │
│[01_F.. │  ┌─ FEATURES (col-span-4 × 3) ──────────────┐ │
│[02_A.. │  │ card1 │ card2 │ card3                    │ │
│[03_L.. │  │ card4 │ card5 │ card6                    │ │
│[04_C.. │  └─────────────────────────────────────────┘ │
│[05_C.. │                                               │
│        │  ┌─ CODE PREVIEW ─────────────────────────┐  │
│        │  └─────────────────────────────────────────┘  │
│        │                                               │
│        │  ┌─ ARCHITECTURE ─────────────────────────┐  │
│        │  └─────────────────────────────────────────┘  │
│        │                                               │
│        │  ┌─ COMPARISON + CTA ─────────────────────┐  │
│        │  └─────────────────────────────────────────┘  │
└────────┴───────────────────────────────────────────────┘
```

---

## When to Use

Use when you want a **persistent sidebar navigation** instead of a top navbar — great for documentation-style pages or long-form technical content where nav accessibility throughout the scroll matters. The numbered nav links (`[01_Features]`) reinforce the tactical/systematic aesthetic.

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Standard head + holo-slide + scanline -->
    <!-- float: rotateX(20deg) rotateZ(-10deg) -->
    <!-- body: display flex; overflow-x hidden -->
    <!-- bg-grid-large: 160px grid -->
    <!-- .tactical-border-r: border-right + right-side glow box-shadow -->
  </head>
  <body class="flex overflow-x-hidden" style="background:#020408;">
    <!-- Fixed overlays (grid-large + vignette) -->
    <div
      class="fixed inset-0 opacity-30 pointer-events-none z-0"
      style="background-size:160px 160px; background-image:linear-gradient(to right,rgba(0,240,255,0.03)1px,transparent 1px),linear-gradient(to bottom,rgba(0,240,255,0.03)1px,transparent 1px);"
    ></div>

    <!-- Fixed sidebar (w-64) -->
    <aside
      class="fixed left-0 top-0 bottom-0 w-64 z-[100] bg-hex-bg/90 backdrop-blur-xl flex flex-col p-8"
      style="border-right:1px solid rgba(0,240,255,0.2); box-shadow:4px 0 30px -10px rgba(0,240,255,0.2);"
    >
      <div class="flex items-center gap-3 cursor-pointer mb-16 group">
        <!-- hex SVG (group-hover:rotate-90 duration-500) + HexDI text -->
      </div>
      <nav
        class="flex flex-col gap-8 text-[11px] font-mono tracking-[0.2em] text-hex-muted uppercase flex-grow"
      >
        <!-- [01_Features] through [05_Compare] with animated underline -->
      </nav>
    </aside>

    <!-- Scrollable main (ml-64) -->
    <main class="ml-64 flex-1 min-h-screen relative z-10">
      <!-- Hero: full-width hud-card min-h-[500px] -->
      <!-- Features: grid-cols-12, col-span-4 cards -->
      <!-- Code preview, Architecture, Comparison, CTA -->
    </main>
  </body>
</html>
```

</details>

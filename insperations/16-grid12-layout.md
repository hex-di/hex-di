# 16 — Landing Page (Grid-12 Layout)

**File:** `16.html`
**Title:** HexDI - Structural Dependency Injection
**Type:** Marketing landing page
**Layout:** CSS Grid 12-column, max-w-[1400px], standard top nav

---

![Screenshot](./screenshots/16.png)

## Overview

Uses a **CSS Grid 12-column layout** for the main content area — the hero, features, code, and other sections are all placed via `md:col-span-N`. The nav is `h-16` (compact). The card backdrop uses the strongest blur (`blur(12px)`) and smaller 10px corner brackets. Float animation uses `rotateX(10deg)` only (no Z rotation). No hover lift on cards — only subtle border/bg change on hover.

---

## Color Palette

Standard HexDI palette. No overrides.

---

## Animation Tokens

| Name | Duration | Details |
|---|---|---|
| `float` | 6s | `translateY(0) rotateX(10deg)` ↔ `translateY(-15px) rotateX(12deg)` — X-only tilt |
| `scanline` | 8s | Slow CRT sweep |
| `holo-slide` | 3s | Shimmer drift |
| `pulse-glow` | 2s | Standard glow |
| `spin-slow` | 20s | Full rotation |

---

## CSS Differences from Standard

### `.hud-card`
```css
.hud-card {
  background: rgba(8, 16, 28, 0.4);
  backdrop-filter: blur(12px);        /* STRONGEST blur in all variants */
  border: 1px solid rgba(0, 240, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.hud-card::before, .hud-card::after {
  width: 10px; height: 10px;          /* SMALLEST corners (10px vs standard 15px) */
}
.hud-card:hover {
  border-color: rgba(0, 240, 255, 0.4);
  background: rgba(0, 240, 255, 0.05);
  /* NO transform — only color change */
}
```

### `.clip-slant` (renamed variant)
```css
.clip-slant {
  clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
}
```
Note: renamed from `.clip-path-slant` to `.clip-slant` in this file.

---

## Navigation (h-16)

```html
<nav class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl h-16">
  <div class="max-w-[1400px] mx-auto px-6 w-full flex items-center justify-between">
    Logo (24px) + [Features] [Architecture] [Docs] + "SYS_v2.4" badge
  </div>
</nav>
```

---

## Main Layout (Grid-12)

```html
<main class="max-w-[1400px] mx-auto px-6 pt-24 pb-20 grid grid-cols-1 md:grid-cols-12 gap-6">
```

### Hero Block (`md:col-span-12`)
Full-width card: `hud-card overflow-hidden min-h-[500px] flex flex-col lg:flex-row items-center p-8 lg:p-16 gap-12`

```
┌──────────────────────────────────────────────────────────────┐
│  bg-radar-gradient (opacity 0.30)                            │
│  top edge: 1px pulse gradient (via-hex-primary)              │
│                                                              │
│  Text side (flex-1)             │  SVG side (flex-1 max-w-md)│
│  Orange badge (STABLE_PROTOCOL) │  Hex SVG animate-float      │
│  H1: text-5xl md:text-7xl       │  rotateX(10deg) only        │
│  "COMPILE_TIME"                 │                            │
│  "STRUCTURAL" (cyan glow)       │                            │
│  "INTEGRITY."                   │                            │
│  Mono subtext (left border)     │                            │
│  [Initialize_Core] [View_Docs]  │                            │
└──────────────────────────────────────────────────────────────┘
```

### Feature Cards (`md:col-span-4`)
3 cards per row, each `col-span-4`. Standard icon + title + description.

### Remaining Sections
Continue in 12-col grid placement:
- Code preview: `md:col-span-7` + sidebar `md:col-span-5`
- Architecture: `md:col-span-12`
- Lifetime scopes: `md:col-span-4` × 3
- Comparison: `md:col-span-6` × 2
- CTA: `md:col-span-12`

---

## Full Layout Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  NAV  h-16  max-w-[1400px]                                  │
├─────────────────────────────────────────────────────────────┤
│  MAIN  grid-cols-12  gap-6  max-w-[1400px]                  │
│                                                             │
│  ┌── HERO ────────────────────────── col-span-12 ──────┐   │
│  │ text(left) + hex SVG (right, float rotateX only)    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ col-4 ─┐  ┌─ col-4 ─┐  ┌─ col-4 ─┐  (features)   │   │
│  └─────────┘  └─────────┘  └─────────┘                 │   │
│                                                             │
│  ┌─── CODE (col-7) ────────┐  ┌─ SIDEBAR (col-5) ───┐  │   │
│  └─────────────────────────┘  └─────────────────────┘  │   │
│                                                             │
│  ┌── ARCHITECTURE ───────────────────── col-span-12 ──┐   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─col-4─┐ ┌─col-4─┐ ┌─col-4─┐  (lifetime scopes)    │   │
│                                                             │
│  ┌─ col-6 ──────┐  ┌─ col-6 ──────┐  (comparison)    │   │
│                                                             │
│  ┌── CTA ────────────────────────── col-span-12 ──────┐   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## When to Use

Use when you need a structured **grid-based layout** that gives precise control over column spans across sections. The 12-column grid enables asymmetric layouts (code + sidebar, etc.) that the standard `py-XX` section layout doesn't support. Good for landing pages that need mixed column ratios.


---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Standard head + holo-slide + scanline 8s -->
  <!-- float: translateY(-15px) rotateX(12deg) — X tilt ONLY, no Z rotation -->
  <!-- hud-card: blur(12px), 10px corners (smallest), hover: color change only (NO transform) -->
  <!-- .clip-slant (NOT clip-path-slant): polygon(0 0,100% 0,95% 100%,0% 100%) -->
</head>
<body class="bg-hex-bg" style="-webkit-font-smoothing:antialiased;">

  <!-- Nav: h-16, max-w-[1400px] -->
  <nav class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl h-16">
    <div class="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
      <!-- 24px logo + links + SYS_v2.4 label -->
    </div>
  </nav>

  <!-- Grid-12 main, max-w-[1400px] -->
  <main class="max-w-[1400px] mx-auto px-6 pt-24 pb-20 grid grid-cols-1 md:grid-cols-12 gap-6">
    <div class="md:col-span-12 hud-card ..."><!-- Hero --></div>
    <div class="md:col-span-4 hud-card p-6"><!-- Feature 1 --></div>
    <div class="md:col-span-4 hud-card p-6"><!-- Feature 2 --></div>
    <div class="md:col-span-4 hud-card p-6"><!-- Feature 3 --></div>
    <div class="md:col-span-7 hud-card p-6"><!-- Code terminal --></div>
    <div class="md:col-span-5 hud-card p-6"><!-- Sidebar --></div>
    <div class="md:col-span-12 hud-card p-8"><!-- Architecture --></div>
    <div class="md:col-span-4 hud-card p-6"><!-- Singleton --></div>
    <div class="md:col-span-4 hud-card p-6"><!-- Transient --></div>
    <div class="md:col-span-4 hud-card p-6"><!-- Scoped --></div>
    <div class="md:col-span-6 hud-card p-6"><!-- HexDI --></div>
    <div class="md:col-span-6 hud-card p-6 opacity-60"><!-- Traditional --></div>
    <div class="md:col-span-12 hud-card p-12 text-center"><!-- CTA --></div>
  </main>

</body>
</html>
```

</details>

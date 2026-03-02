# 01 — Landing Page (Standard)

**File:** `1.html`
**Title:** HexDI - Structural Dependency Injection
**Type:** Marketing landing page
**Layout:** Vertical scroll, full-width sections

---

![Screenshot](./screenshots/01.png)

## Overview

The foundational landing page design. Dark cyberpunk/tactical aesthetic with cyan + orange accent palette. Establishes the core visual language used across all variants.

---

## Color Palette

Uses the standard HexDI palette (see `design-system.md`).

- Background: `#020408`
- Primary: `#00F0FF` (cyan)
- Accent: `#FF5E00` (orange)
- Text: `#DAE6F0`
- Muted: `#586E85`

---

## Typography

- Headings: **Rajdhani** Bold, UPPERCASE, tight tracking
- Body: **Inter**
- Code/labels: **Fira Code**
- Hero h1: `text-5xl md:text-7xl leading-[0.9] tracking-tight`
- Gradient text: `bg-clip-text bg-gradient-to-r from-hex-primary to-hex-primaryLight`

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAV  fixed h-20  logo | links | status badge + github      │
├─────────────────────────────────────────────────────────────┤
│  HERO  min-h-screen                                         │
│  ┌────────────────────┬────────────────────────────────┐    │
│  │  Left col (text)   │  Right col (hex graph SVG)     │    │
│  │  - badge           │  - floating animated hexagon   │    │
│  │  - h1              │    with 6 node labels          │    │
│  │  - subtext         │                                │    │
│  │  - 2 buttons       │                                │    │
│  │  - install widget  │                                │    │
│  └────────────────────┴────────────────────────────────┘    │
│  scroll indicator (bottom center)                           │
├─────────────────────────────────────────────────────────────┤
│  FEATURES  #features  py-32                                 │
│  - section heading w/ cyan square bullet                    │
│  - 3-column grid of hud-cards (2+3 on md/lg)               │
│    6 cards: Compile Validation / Zero Overhead / Deep Types │
│             React Integration / Immutable Composition /     │
│             Explicit Lifetimes                              │
├─────────────────────────────────────────────────────────────┤
│  CODE PREVIEW  py-24  bg-[#05080F]                          │
│  ┌──────────────────┬──────────────────────────────────┐    │
│  │  2/5 text col    │  3/5 code window col             │    │
│  │  - h2            │  - terminal header               │    │
│  │  - description   │  - scanline overlay              │    │
│  │  - [OK] checklist│  - syntax-highlighted code       │    │
│  └──────────────────┴──────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  MODULE ARCHITECTURE  #architecture  py-32                  │
│  - centered heading                                         │
│  - SVG diagram (4-node: CORE/GRAPH/RUNTIME/REACT/TESTING)  │
│  - 4-column package cards row                               │
├─────────────────────────────────────────────────────────────┤
│  LIFETIME SCOPES  py-24                                     │
│  - 3-column grid: Singleton (blue) / Scoped (cyan) /        │
│    Transient (orange)                                       │
│  - each card has code snippet with left-border accent       │
├─────────────────────────────────────────────────────────────┤
│  COMPARISON  py-32  quote section                           │
│  - oversized display quote                                  │
│  - 2-col: "Legacy Protocol" (red) vs "HexDI Protocol" (cyan)│
├─────────────────────────────────────────────────────────────┤
│  CTA  py-24  full-width bordered box                        │
│  - large heading                                            │
│  - 2 buttons: primary (solid cyan) + secondary (ghost)      │
├─────────────────────────────────────────────────────────────┤
│  FOOTER  py-12  centered  logo + copyright                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation

- **Height:** `h-20` fixed
- **Background:** `bg-hex-bg/90 backdrop-blur-md`
- **Bottom border:** `tactical-border-b` — `1px solid rgba(0,240,255,0.3)` + glow shadow
- **Logo:** Hex SVG + "Hex**DI**" (DI in cyan)
- **Links:** `[Features]` `[Architecture]` `[Docs]` — monospace bracket-wrapped, hover cyan
- **Right side:** status badge (`SYS.ONLINE` with pulsing accent dot) + GitHub icon

---

## Hero Section

**Background decorations:**

- Radial gradient spotlight centered (800×800px, cyan)
- CRT scanline overlay (repeating horizontal lines, `opacity-20`)

**Left column:**

- Orange badge: `Compile-Time Safety v2.0` with square pulsing dot
- H1: "The compiler reviews the **architecture**. / You review the logic."
  - "architecture" in gradient cyan text
  - Second line in `text-hex-muted text-4xl md:text-6xl`
- Subtext in `font-mono text-sm` with left border accent (`border-l-2 border-hex-primary/20`)
  - Prefixed with `// STOP DEBUGGING...` comment style
- **CTA buttons:** (horizontal stack on sm+)
  - Primary: `bg-hex-primary/10 border border-hex-primary text-hex-primary`, clip-path slant, glow shadow
  - Secondary: ghost, slide-up fill on hover
- **Install widget:** `$ npm install @hex-di/core` with copy button, corner bracket decoration

**Right column:**

- Animated SVG hexagon graph: `animate-float`, `transform: rotateX(20deg) rotateZ(-10deg)`
- 6 nodes: CONTAINER (orange), SERVICE/REPO/DB/ADAPTER/PORT (cyan)
- Gradient connecting lines (fade in/out from center)
- Center crosshair with pulsing radial glow

---

## Feature Cards (`hud-card`)

- Corner brackets animate to full width/height on hover
- Icon: 48×48px square icon container with colored border + fill
- Each card has unique accent color:
  - Compile Validation → cyan
  - Zero Overhead → orange
  - Deep Type → purple
  - React Integration → blue
  - Immutable Composition → indigo
  - Explicit Lifetimes → pink

---

## HUD Telemetry Labels (xl only)

```
Left:  "Build: Stable / v2.4.0"      — border-l
Right: "System: Rigid / Scope: Global" — border-r
```

---

## Key UX Patterns

- Text selection: `bg-hex-primary text-black` (cyan highlight)
- Global scrollbar: 6px, cyan thumb
- All section backgrounds alternate between `#020408` and `#05080F`
- Section transitions use consistent border `border-hex-primary/20`

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Standard head: Tailwind CDN + fonts + config + CSS (see design-system.md) -->
    <!-- float keyframe: translateY(0) ↔ translateY(-10px) — simple vertical only -->
    <!-- hud-card: blur(4px), 10px corners, hover lifts + border glow -->
  </head>
  <body class="bg-hex-bg bg-grid overflow-x-hidden">
    <div class="fixed inset-0 bg-grid opacity-30 pointer-events-none z-0"></div>
    <div
      class="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,4,8,0.8)_100%)] pointer-events-none z-0"
    ></div>

    <nav
      class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl"
    >
      <div class="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
        <!-- Logo + [Features][Architecture][Docs] links + SYS_v2.4 badge -->
      </div>
    </nav>

    <main class="relative z-10">
      <section class="min-h-screen flex items-center pt-20 relative">
        <div class="max-w-7xl mx-auto px-10 grid lg:grid-cols-2 gap-16 items-center">
          <div><!-- Badge + H1 + subtext + [Initialize_Core][View_Docs] + install widget --></div>
          <div class="flex justify-end"><!-- Hex SVG class="animate-float" --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10">
          <div class="grid md:grid-cols-3 gap-6"><!-- 6× hud-card features --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10"><!-- Terminal window --></div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10"><!-- Architecture SVG --></div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10">
          <div class="grid md:grid-cols-3 gap-6"><!-- 3× lifetime scope cards --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10">
          <div class="grid md:grid-cols-2 gap-6"><!-- Comparison: HexDI vs Traditional --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10"><!-- CTA card --></div>
      </section>
      <footer class="border-t border-hex-primary/10 py-12"><!-- footer --></footer>
    </main>
  </body>
</html>
```

</details>

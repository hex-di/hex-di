# 14 — Mobile-First Snap Scroll

**File:** `14.html`
**Title:** HexDI - Mobile First DI
**Type:** Mobile-optimized landing page
**Layout:** CSS scroll-snap vertical, each section = 100vh, fixed bottom nav

---

![Screenshot](./screenshots/14.png)

## Overview

A mobile-first design with CSS scroll-snap locking. Each section is exactly `100vh` tall and scrolls with snap behavior. A fixed bottom navigation bar provides section-to-section navigation. Some sections contain horizontal card carousels (also snap-scrolling). The page hides the default scrollbar.

---

## Color Palette

Standard HexDI palette. No overrides.

---

## Root Layout

```css
body { overflow: hidden; height: 100vh; }

.mobile-snap-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  /* scrollbar hidden */
}

.snap-section {
  scroll-snap-align: start;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
```

---

## Navigation

**Top nav:** Fixed, minimal (`bg-hex-bg/40 backdrop-blur-md px-6 py-4`), no nav links — just logo + version badge.
```html
<nav class="fixed top-0 w-full z-50 ...">
  HexDI logo + "v2.4.0" badge
</nav>
```

**Bottom nav anchor:** Fixed at bottom, gradient fade-up background:
```css
.bottom-nav-anchor {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, #020408 80%, transparent);
  padding: 1.5rem;
  z-index: 100;
  border-top: 1px solid rgba(0,240,255,0.1);
}
```
Contains CTA buttons or section navigation hints.

---

## Sections (5 snap sections)

### Section 1: Hero
```html
<section class="snap-section flex flex-col justify-center items-center px-6 text-center">
```
- **Centered** text (unlike desktop left/right split)
- Orange badge: `STABLE_PROTOCOL`
- H1: `text-5xl` — "COMPILE_TIME / **STRUCTURAL** / INTEGRITY."
  - "STRUCTURAL" in cyan with drop shadow glow
  - Third line in `text-hex-muted/40 text-4xl`
- Subtext: small mono paragraph
- Scanline overlay at section level

### Section 2: Features (horizontal scroll)
```css
.horizontal-scroll {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 1rem;
  padding: 0 1.5rem;
}
```
Each feature card: `min-width: 85vw; scroll-snap-align: start;`
The user swipes horizontally through the 6 feature cards.

### Section 3: Code Preview
Full-screen terminal window centered, occupying most of the 100vh height.

### Section 4: Architecture / Lifetime Scopes
Vertical stack of the architecture diagram + 3-col lifetime cards (condensed for mobile).

### Section 5: CTA + Footer
Large CTA heading + buttons + footer, centered.

---

## Layout Diagram

```
┌─────────────────────┐  ← 100vw
│  NAV (fixed top)    │
│─────────────────────│
│                     │
│   SNAP SECTION 1    │  ← 100vh
│   HERO (centered)   │
│                     │
│─────────────────────│
│  BOTTOM NAV (fixed) │
└─────────────────────┘
        ↕ scroll-snap
┌─────────────────────┐
│  SNAP SECTION 2     │  ← 100vh
│  ← CARDS CAROUSEL→ │  (horizontal swipe 85vw each)
└─────────────────────┘
        ↕
┌─────────────────────┐
│  SNAP SECTION 3     │  ← 100vh
│  CODE PREVIEW       │
└─────────────────────┘
        ↕
┌─────────────────────┐
│  SNAP SECTION 4     │  ← 100vh
│  ARCHITECTURE + LT  │
└─────────────────────┘
        ↕
┌─────────────────────┐
│  SNAP SECTION 5     │  ← 100vh
│  CTA + FOOTER       │
└─────────────────────┘
```

---

## Mobile-Specific Patterns

- No HUD telemetry labels (xl breakpoint only)
- No mouse parallax
- No horizontal text layout in hero — everything centered
- Feature cards in horizontal scroll carousel rather than grid
- Minimal nav (no links, just logo + version)
- Bottom gradient anchors CTA buttons persistently

---

## When to Use

Use as the **mobile landing page** target or for any mobile-first presentation. The snap sections create a slideshow-like experience. Also useful as reference for implementing horizontal card carousels with snap behavior.


---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Minimal head: no float animation needed -->
  <!-- body: overflow:hidden; height:100vh -->
  <!-- viewport: user-scalable=no -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
</head>
<body style="background:#020408; color:#DAE6F0; overflow:hidden; height:100vh; width:100vw;">

  <nav class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 h-14 flex items-center px-6">
    <!-- Logo + SYS.ONLINE badge -->
  </nav>

  <!-- Vertical snap container -->
  <div style="scroll-snap-type:y mandatory; overflow-y:scroll; height:100vh; scrollbar-width:none; -ms-overflow-style:none;">

    <section style="scroll-snap-align:start; height:100vh; position:relative; overflow:hidden;">
      <!-- Panel 1: Hero — badge + H1 + CTAs, centered -->
    </section>

    <section style="scroll-snap-align:start; height:100vh; position:relative;">
      <!-- Panel 2: Features — horizontal scroll cards row -->
    </section>

    <section style="scroll-snap-align:start; height:100vh; position:relative;">
      <!-- Panel 3: Code terminal -->
    </section>

    <section style="scroll-snap-align:start; height:100vh; position:relative;">
      <!-- Panel 4: Architecture SVG -->
    </section>

    <section style="scroll-snap-align:start; height:100vh; position:relative;">
      <!-- Panel 5: CTA + footer -->
    </section>

  </div>

</body>
</html>
```

</details>

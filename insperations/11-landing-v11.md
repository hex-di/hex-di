# 11 — Landing Page (v11 / Large Grid Variant)

**File:** `11.html`
**Title:** HexDI - Structural Dependency Injection
**Type:** Marketing landing page
**Layout:** Vertical scroll, full-width sections

---

![Screenshot](./screenshots/11.png)

## Overview

Very similar to `03-landing-parallax.md` (file 3). Uses `bg-grid-large` (160px grid), `section-scanline` overlays, and `holo-element` shimmer. The key difference from file 3 is the **float animation** — a milder 3D tilt with no Z-axis rotation, and no mouse parallax JavaScript.

---

## Color Palette

Standard HexDI palette. No overrides.

---

## Animation Tokens

| Name | Duration | Details |
|---|---|---|
| `float` | 6s | `translateY(0) rotateX(15deg)` ↔ `translateY(-15px) rotateX(17deg)` — **X-only tilt, no Z** |
| `scanline` | 6s | CRT sweep |
| `holo-slide` | 3s | Shimmer drift |
| `pulse-glow` | 2s | Glow pulse |
| `spin-slow` | 20s | Full rotation |

---

## Key Differences from File 3

| Feature | File 11 | File 3 |
|---|---|---|
| Float rotation | `rotateX(15deg)` only | `rotateX(20deg) rotateZ(-10deg)` |
| Mouse parallax | **No** | Yes |
| macOS traffic lights | Varies | Yes |
| Grid background | `bg-grid-large` 160px | `bg-grid-large` 160px |
| Holo-element | Yes | Yes |
| Section scanlines | Yes | Yes |
| Hover lift cards | Yes | Yes |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAV  fixed h-20  (standard)                                │
├─────────────────────────────────────────────────────────────┤
│  HERO  min-h-screen  bg-grid-large + holo-element           │
│  - section-scanline overlay                                 │
│  Left: badge + h1 + subtext + buttons + install widget      │
│  Right: hex SVG (float + rotateX(15deg), no Z rotation)     │
├─────────────────────────────────────────────────────────────┤
│  FEATURES  3×2 hud-card (hover lift variant)                │
├─────────────────────────────────────────────────────────────┤
│  CODE PREVIEW  (standard terminal)                          │
├─────────────────────────────────────────────────────────────┤
│  MODULE ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────┤
│  LIFETIME SCOPES  3-col                                     │
├─────────────────────────────────────────────────────────────┤
│  COMPARISON  2-col                                          │
├─────────────────────────────────────────────────────────────┤
│  CTA                                                        │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## When to Use

Use as an alternative to file 3 when you want the large-grid + holo shimmer aesthetic but a slightly more grounded 3D perspective (X-only tilt, no diagonal spin) and no JS parallax dependency.


---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Standard head + holo-slide + scanline 6s -->
  <!-- float: translateY(-20px) rotateX(22deg) rotateZ(-8deg) -->
  <!-- hud-card: blur(8px), 15px corners -->
  <!-- body: overflow hidden -->
</head>
<body class="bg-hex-bg overflow-hidden">
  <div class="fixed inset-0 bg-grid opacity-30 pointer-events-none z-0"></div>
  <nav class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
      <!-- Logo + nav links + badge -->
    </div>
  </nav>
  <main class="relative z-10">
    <section class="min-h-screen flex items-center pt-20 relative">
      <div class="max-w-7xl mx-auto px-10 grid lg:grid-cols-2 gap-16 items-center">
        <div><!-- Badge + H1 + subtext + CTAs --></div>
        <div><!-- Hex SVG animate-float (diagonal tilt) + holo-slide --></div>
      </div>
    </section>
    <!-- Features → Code → Architecture → Lifetime → Comparison → CTA → Footer -->
  </main>
</body>
</html>
```

</details>

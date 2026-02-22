# 07 — Landing Page (Holo Shimmer)

**File:** `7.html`
**Title:** HexDI - Structural Dependency Injection
**Type:** Marketing landing page
**Layout:** Vertical scroll, full-width sections

---

![Screenshot](./screenshots/07.png)

## Overview

A clean mid-tier variant that adds the `holo-shimmer` background gradient and `holo-slide` animation to the hero section. The float animation uses a mild 3D tilt (`rotateX(10deg) rotateZ(-5deg)`) — less dramatic than files 3/4. Overall a polished but not extreme version of the design.

---

## Color Palette

Standard HexDI palette. No overrides.
- Background: `#020408`
- Primary: `#00F0FF`
- Accent: `#FF5E00`

---

## Animation Tokens

| Name | Duration | Details |
|---|---|---|
| `float` | 6s | `translateY(0) rotateX(10deg) rotateZ(-5deg)` ↔ `translateY(-15px) rotateX(12deg) rotateZ(-3deg)` — **mild 3D tilt** |
| `scanline` | 6s | Standard CRT sweep |
| `scanline-fast` | 3s | Faster variant available |
| `holo-slide` | 3s | Background-position shimmer drift |
| `pulse-glow` | 2s | Glow pulse |
| `spin-slow` | 20s | Full rotation |

---

## Background Gradients

```js
'radar-gradient': 'radial-gradient(circle at center, rgba(0,240,255,0.12) 0%, rgba(2,4,8,0) 70%)',
'holo-shimmer':   'linear-gradient(45deg, transparent 25%, rgba(0,240,255,0.1) 50%, transparent 75%)',
```

### `.hud-card`
- `background: rgba(8, 16, 28, 0.4)` — lighter than file 6
- `backdrop-filter: blur(8px)`
- Corner brackets: 15px
- Hover: full-width corner expansion (to 100%)

---

## Key Differentiators vs Other Files

| Attribute | File 7 | File 3 | File 1 |
|---|---|---|---|
| Float 3D | rotateX(10deg) rotateZ(-5deg) | rotateX(20deg) rotateZ(-10deg) | none |
| Grid size | 40px std | 160px large | 40px std |
| Holo shimmer | Yes | Yes | No |
| Mouse parallax | No | Yes | No |
| Hover lift | No | Yes | No |
| Section scanlines | No | Yes | No |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAV  fixed h-20  (standard)                                │
├─────────────────────────────────────────────────────────────┤
│  HERO  min-h-screen                                         │
│  - bg-radar-gradient + holo-shimmer on hero section         │
│  Left: badge + h1 + subtext + buttons + install widget      │
│  Right: hex SVG (float + mild 3D tilt)                      │
├─────────────────────────────────────────────────────────────┤
│  FEATURES  3×2 hud-card grid                                │
├─────────────────────────────────────────────────────────────┤
│  CODE PREVIEW  (standard)                                   │
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

A balanced variant between the minimal file 1 and the maximalist file 3. Good default when you want holo shimmer + mild 3D perspective without parallax JS or large-grid bg.

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Standard head: Tailwind CDN + fonts + config + CSS (see design-system.md) -->
  <!-- minimal: no holo-slide, no section scanlines, simpler card hover (border only) -->
  <!-- hud-card: blur(4px), simple border-color transition on hover (no translateY) -->
</head>
<body class="bg-hex-bg bg-grid overflow-x-hidden">
  <div class="fixed inset-0 bg-grid opacity-20 pointer-events-none z-0"></div>

  <nav class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
      <!-- Logo + nav links + SYS_v2.4 badge -->
    </div>
  </nav>

  <main class="relative z-10">
    <section class="min-h-screen flex items-center pt-20 relative">
      <!-- No section scanline, no shimmer — clean holo aesthetic -->
      <div class="max-w-7xl mx-auto px-10 grid lg:grid-cols-2 gap-16 items-center">
        <div><!-- Badge + H1 + subtext + CTAs --></div>
        <div class="flex justify-end"><!-- Hex SVG animate-float (simple Y only) --></div>
      </div>
    </section>
    <section class="py-24"><div class="max-w-7xl mx-auto px-10">
      <!-- Cards: hover changes border-color only, no scale/translate -->
      <div class="grid md:grid-cols-3 gap-6"><!-- 6× minimal hud-card features --></div>
    </div></section>
    <section class="py-24"><div class="max-w-7xl mx-auto px-10"><!-- Terminal --></div></section>
    <section class="py-24"><div class="max-w-7xl mx-auto px-10"><!-- Architecture --></div></section>
    <section class="py-24"><div class="max-w-7xl mx-auto px-10">
      <div class="grid md:grid-cols-3 gap-6"><!-- 3× lifetime cards --></div>
    </div></section>
    <section class="py-24"><div class="max-w-7xl mx-auto px-10">
      <div class="grid md:grid-cols-2 gap-6"><!-- Comparison --></div>
    </div></section>
    <section class="py-24"><div class="max-w-7xl mx-auto px-10"><!-- CTA --></div></section>
    <footer class="border-t border-hex-primary/10 py-12"><!-- footer --></footer>
  </main>
</body>
</html>
```

</details>

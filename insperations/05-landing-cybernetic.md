# 05 — Landing Page (Cybernetic DI)

**File:** `5.html`
**Title:** HexDI - Cybernetic Dependency Injection
**Type:** Marketing landing page
**Layout:** Vertical scroll, full-width sections

---

![Screenshot](./screenshots/05.png)

## Overview

The "Cybernetic DI" variant with a slightly darker, deeper dark palette and a distinctive **scrolling grid with radial mask** background effect. Introduces the `glitch` text-shadow animation and a `corner-br` (2-corner bracket) decoration pattern. More minimal animation set — no `holo-slide` or 3D rotation.

---

## Color Overrides

| Token | Value | Note |
|---|---|---|
| `hex-bg` | `#010306` | Deeper black (standard is `#020408`) |
| `hex-surface` | `#050a14` | Deeper surface |
| `hex-muted` | `#4a5d71` | Slightly darker muted text |
| All others | Standard | Same cyan/orange/text |

---

## Animation Tokens

| Name | Duration | Details |
|---|---|---|
| `float` | 6s | Simple vertical bob only: `translateY(0)` ↔ `translateY(-15px)` — NO 3D rotation |
| `pulse-grid` | 4s | Grid opacity oscillates: `0.05` ↔ `0.15` (breathing grid effect) |
| `scanline` | 4s | Faster CRT sweep (vs 8s standard) |
| `glitch` | 1s | RGB text-shadow split (see below), `alternate-reverse` |
| `spin-slow` | 20s | Full rotation |

---

## New CSS Classes

### `.scrolling-grid`
Distinctive masked background grid used as hero backdrop:
```css
.scrolling-grid {
  background-image:
    linear-gradient(to right, rgba(0, 240, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 240, 255, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
}
```
The radial mask creates a "visible in center, fades at edges" effect.

### `.glitch` keyframes
```css
@keyframes glitch {
  0%:   textShadow: '2px 0 0 #FF5E00, -2px 0 0 #00F0FF'
  25%:  textShadow: '-2px 0 0 #FF5E00, 2px 0 0 #00F0FF'
  50%:  textShadow: '1px 1px 0 #FF5E00, -1px -1px 0 #00F0FF'
  75%:  textShadow: '-1px -1px 0 #FF5E00, 1px 1px 0 #00F0FF'
  100%: textShadow: '2px 0 0 #FF5E00, -2px 0 0 #00F0FF'
}
```

### `.glitch-text:hover`
Applied to headings — triggers glitch animation on hover:
```css
.glitch-text:hover {
  animation: glitch 0.2s infinite;
}
```

### `.corner-br`
2-corner bracket (top-left + bottom-right only, no ::after for other corners) — 8px size:
```css
.corner-br::before { top:-2px; left:-2px; border-top: 2px solid #00F0FF; border-left: 2px solid #00F0FF; width:8px; height:8px; }
.corner-br::after  { bottom:-2px; right:-2px; border-bottom: 2px solid #00F0FF; border-right: 2px solid #00F0FF; width:8px; height:8px; }
```

### `.slash-accent`
Diagonal decorative element (likely a `::before` pseudo with a rotated line at section breaks).

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAV  fixed h-20  (deeper bg: #010306/90)                   │
├─────────────────────────────────────────────────────────────┤
│  HERO  min-h-screen                                         │
│  - scrolling-grid bg with radial mask (prominent in hero)   │
│  - pulse-grid animation breathes the grid                   │
│  Left: glitch-text h1 (glitch on hover) + badge + subtext   │
│  Right: hex SVG (float — vertical bob only, no tilt)        │
├─────────────────────────────────────────────────────────────┤
│  FEATURES  3×2 corner-br cards                              │
├─────────────────────────────────────────────────────────────┤
│  CODE PREVIEW  (standard layout)                            │
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

Use when targeting an edgier "cybernetic" aesthetic with on-hover glitch text effects and a deeper, more oppressive dark palette. The radial-masked scrolling grid creates a distinct hero atmosphere versus the standard full-bleed grid.

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Standard head: Tailwind CDN + fonts + config + CSS (see design-system.md) -->
  <!-- holo-element: bg-holo-shimmer animate-holo-slide bg-[length:200%_100%] -->
  <!-- Section shimmer overlays on hero and feature sections -->
  <!-- hud-card: 15px corners, blur(4px) -->
</head>
<body class="bg-hex-bg bg-grid overflow-x-hidden">
  <div class="fixed inset-0 bg-grid opacity-30 pointer-events-none z-0"></div>
  <div class="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,4,8,0.8)_100%)] pointer-events-none z-0"></div>

  <nav class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
      <!-- Logo + nav links + SYS_v2.4 badge -->
    </div>
  </nav>

  <main class="relative z-10">
    <section class="min-h-screen flex items-center pt-20 relative overflow-hidden">
      <!-- Holo shimmer element (full section overlay) -->
      <div class="absolute inset-0 bg-holo-shimmer animate-holo-slide bg-[length:200%_100%] opacity-50 pointer-events-none"></div>
      <div class="absolute inset-0 bg-radar-gradient opacity-40 pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-10 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        <div><!-- Badge + H1 + subtext + CTAs + install widget --></div>
        <div class="flex justify-end"><!-- Hex SVG animate-float --></div>
      </div>
    </section>
    <section class="py-24 relative overflow-hidden">
      <!-- Holo shimmer on features section -->
      <div class="absolute inset-0 bg-holo-shimmer animate-holo-slide bg-[length:200%_100%] opacity-20 pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-10 relative z-10">
        <div class="grid md:grid-cols-3 gap-6"><!-- 6× hud-card features --></div>
      </div>
    </section>
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

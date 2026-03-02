# 06 — Landing Page (Neon / Chromatic)

**File:** `6.html`
**Title:** HexDI - Cybernetic Dependency Injection
**Type:** Marketing landing page
**Layout:** Vertical scroll, full-width sections

---

![Screenshot](./screenshots/06.png)

## Overview

The most visually extreme variant. Introduces a **hex tessellation background** (animated SVG tile pattern), **neon purple** as a third accent color, **red-pink accent** replacing orange, and **chromatic aberration** text animation. Also adds `neon-underglow` shadows and a `stream-y` animation. Darkest palette of all variants.

---

## Color Overrides

| Token            | Value     | Note                                 |
| ---------------- | --------- | ------------------------------------ |
| `hex-bg`         | `#010306` | Deepest black                        |
| `hex-surface`    | `#050a14` | Deep surface                         |
| `hex-accent`     | `#FF0055` | Red-pink (replaces orange `#FF5E00`) |
| `hex-neonPurple` | `#BC13FE` | New purple accent                    |
| `hex-muted`      | `#586E85` | Standard muted                       |

---

## Animation Tokens

| Name          | Duration | Details                                                    |
| ------------- | -------- | ---------------------------------------------------------- |
| `float`       | 6s       | Simple vertical bob: `translateY(0)` ↔ `translateY(-10px)` |
| `pulse-glow`  | 2s       | Stronger glow: `0 0 30px rgba(0,240,255,0.6)` at peak      |
| `scanline`    | 4s       | Fast CRT sweep                                             |
| `stream-y`    | 10s      | Secondary vertical stream (data cascade visual)            |
| `chroma`      | 2s–3s    | Chromatic aberration text-shadow oscillation               |
| `hex-pattern` | 120s     | Slow drift of hex tile background                          |

---

## New CSS Classes

### `.bg-hex-tessellation`

Animated SVG hex tile background (data URI):

```css
.bg-hex-tessellation {
  background-image: url("data:image/svg+xml, /* hex grid SVG */ ");
  /* SVG: 60×104px hex path, fill=#00f0ff, fill-opacity=0.03 */
  animation: hex-pattern 120s linear infinite;
}
@keyframes hex-pattern {
  0%:   backgroundPosition: '0 0'
  100%: backgroundPosition: '1000px 1000px'
}
```

### `.chromatic-text`

```css
.chromatic-text {
  animation: chroma 3s infinite;
}
@keyframes chroma {
  0%,100%: textShadow: '2px 0 0 rgba(255,0,85,0.5), -2px 0 0 rgba(0,240,255,0.5)'
  50%:     textShadow: '-2px 0 0 rgba(255,0,85,0.5), 2px 0 0 rgba(0,240,255,0.5)'
}
```

Applied to hero h1 and major headings.

### `.neon-underglow-primary`

```css
.neon-underglow-primary {
  box-shadow: 0 10px 30px -10px rgba(0, 240, 255, 0.4);
}
.neon-underglow-primary:hover {
  box-shadow: 0 15px 40px -5px rgba(0, 240, 255, 0.7);
}
```

### `.neon-underglow-accent`

```css
.neon-underglow-accent {
  box-shadow: 0 10px 30px -10px rgba(255, 0, 85, 0.4);
}
```

### `.hud-card` (variant)

- `background: rgba(5, 10, 20, 0.85)` — more opaque
- `backdrop-filter: blur(12px)` — stronger blur
- Corner brackets: 15px (standard size)
- Transition: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` (springy bounce)

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAV  fixed h-20  (deepest bg variant)                      │
├─────────────────────────────────────────────────────────────┤
│  HERO  min-h-screen                                         │
│  - bg-hex-tessellation (animated SVG tile, slow drift)      │
│  - stream-y data cascade overlay                            │
│  Left: chromatic-text h1 + badge (red-pink accent)          │
│        + buttons with neon-underglow shadows                 │
│  Right: hex SVG (float vertical only)                       │
├─────────────────────────────────────────────────────────────┤
│  FEATURES  3×2 hud-card (springy hover transition)          │
│  - neonPurple used for some card icon accents               │
├─────────────────────────────────────────────────────────────┤
│  CODE PREVIEW  (standard layout)                            │
├─────────────────────────────────────────────────────────────┤
│  MODULE ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────┤
│  LIFETIME SCOPES  3-col                                     │
│  - Transient card uses red-pink accent (instead of orange)  │
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

Use for a maximum-neon aesthetic targeting a nightclub/rave-cyberpunk tone. Chromatic aberration text + hex tile background + purple accent creates the most visually aggressive variant. Note: red-pink accent replaces orange, so verify that design intent aligns.

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Standard head: Tailwind CDN + fonts + config + CSS (see design-system.md) -->
    <!-- bg-grid: 80px cell size (larger grid variant) -->
    <!-- rotate animation added to hex SVG outer ring (spin-slow: 20s linear infinite) -->
    <!-- Full featured: all animations active, heavy glow effects -->
  </head>
  <body
    class="bg-hex-bg overflow-x-hidden"
    style="background-size: 80px 80px; background-image: linear-gradient(to right, rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.05) 1px, transparent 1px);"
  >
    <div
      class="fixed inset-0 opacity-30 pointer-events-none z-0"
      style="background-size: 80px 80px; background-image: linear-gradient(to right, rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.05) 1px, transparent 1px);"
    ></div>
    <div
      class="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,4,8,0.8)_100%)] pointer-events-none z-0"
    ></div>

    <nav
      class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl"
    >
      <div class="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
        <!-- Logo + nav links + SYS_v2.4 badge -->
      </div>
    </nav>

    <main class="relative z-10">
      <section class="min-h-screen flex items-center pt-20 relative overflow-hidden">
        <div class="absolute inset-0 bg-radar-gradient opacity-60 pointer-events-none"></div>
        <div class="scanline pointer-events-none"></div>
        <div class="max-w-7xl mx-auto px-10 grid lg:grid-cols-2 gap-16 items-center">
          <div><!-- Badge + H1 + subtext + CTAs + install widget --></div>
          <div class="flex justify-end">
            <svg class="animate-float w-80 h-80 opacity-80" viewBox="0 0 300 300">
              <!-- Outer ring with class="animate-spin-slow" -->
              <polygon
                class="animate-spin-slow"
                style="transform-origin: 150px 150px;"
                points="150,20 270,85 270,215 150,280 30,215 30,85"
                fill="none"
                stroke="#00F0FF"
                stroke-width="1.5"
                opacity="0.6"
              />
              <polygon
                points="150,80 220,121 220,179 150,220 80,179 80,121"
                fill="rgba(0,240,255,0.05)"
                stroke="#00F0FF"
                stroke-width="1.5"
              />
              <circle cx="150" cy="150" r="20" fill="none" stroke="#FF5E00" stroke-width="2" />
              <circle cx="150" cy="150" r="6" fill="#FF5E00" />
            </svg>
          </div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10">
          <div class="grid md:grid-cols-3 gap-6"><!-- 6× hud-card features --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10"><!-- Terminal --></div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10"><!-- Architecture --></div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10">
          <div class="grid md:grid-cols-3 gap-6"><!-- 3× lifetime cards --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10">
          <div class="grid md:grid-cols-2 gap-6"><!-- Comparison --></div>
        </div>
      </section>
      <section class="py-24">
        <div class="max-w-7xl mx-auto px-10"><!-- CTA --></div>
      </section>
      <footer class="border-t border-hex-primary/10 py-12"><!-- footer --></footer>
    </main>
  </body>
</html>
```

</details>

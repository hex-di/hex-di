# Guard — Shared Design System

Design tokens and conventions for all `@hex-di/guard` website inspirations. Inherits the HexDI dark aesthetic but replaces the cyan/orange palette with an amber-on-black identity. Amber/gold evokes shields, security badges, and authority. Red is used for "deny" decisions, contrasting with amber "allow".

---

## Color Tokens

| Token            | Value                | Usage                                              |
| ---------------- | -------------------- | -------------------------------------------------- |
| `bg`             | `#020408`            | Page background (darkest)                          |
| `surface`        | `#08101C`            | Section backgrounds, panels                        |
| `card`           | `#0a1420`            | Card/code block surfaces                           |
| `accent`         | `#F59E0B`            | Amber — CTAs, borders, highlights, mono labels     |
| `accent-40`      | `#F59E0B40`          | Hover states (25% opacity)                         |
| `accent-60`      | `#F59E0B60`          | Strong hover / active states                       |
| `accent-08`      | `#F59E0B08`          | Gradient overlays, subtle tints                    |
| `accent-glow`    | `0 0 20px #F59E0B20` | Box-shadow glow on hover                           |
| `deny`           | `#EF4444`            | Red — deny decisions, error states, "before" cards |
| `deny-20`        | `#EF444433`          | Deny card borders, subtle backgrounds              |
| `allow`          | `#22C55E`            | Green — allow decisions, success indicators        |
| `text`           | `#FFFFFF`            | Headings, primary text                             |
| `text-secondary` | `#a0b4c8`            | Subtitles, taglines                                |
| `text-muted`     | `#8a9bb0`            | Body copy, descriptions                            |
| `border`         | `#1a2a3e`            | Card borders, dividers                             |

### Semantic mapping to core HexDI palette

| Core HexDI token    | Guard override                                          |
| ------------------- | ------------------------------------------------------- |
| `primary` (#00F0FF) | `accent` (#F59E0B) — amber replaces cyan                |
| `accent` (#FF5E00)  | `deny` (#EF4444) — red replaces orange                  |
| `bg` (#020408)      | Same                                                    |
| `surface` (#08101C) | Same                                                    |
| `text` (#DAE6F0)    | Lightened to `#FFFFFF` for headings, `#a0b4c8` for body |
| `muted` (#586E85)   | Shifted to `#8a9bb0` (warmer gray-blue)                 |

### Cross-library color identity

| Library   | Accent                | Secondary                  |
| --------- | --------------------- | -------------------------- |
| Core      | `#00F0FF` (cyan)      | `#FF5E00` (orange)         |
| Result    | `#A6E22E` (lime)      | `#F92672` (pink/red)       |
| **Guard** | **`#F59E0B` (amber)** | **`#EF4444` (red — deny)** |

---

## Typography

| Role         | Font      | Weights | Size                         | Notes                                              |
| ------------ | --------- | ------- | ---------------------------- | -------------------------------------------------- |
| H1 (hero)    | Rajdhani  | 700     | `clamp(2.5rem, 5vw, 4rem)`   | letter-spacing: -0.02em                            |
| H2 (section) | Rajdhani  | 700     | `clamp(1.8rem, 3vw, 2.6rem)` | letter-spacing: -0.01em, line-height: 1.2          |
| H3 (card)    | Rajdhani  | 600     | 1.1rem–1.25rem               |                                                    |
| Body         | Inter     | 400     | 0.9rem–1.15rem               | line-height: 1.65, color: `text-muted`             |
| Mono label   | Fira Code | 400     | 0.68rem                      | uppercase, letter-spacing: 0.25em, color: `accent` |
| Code blocks  | Fira Code | 400     | 0.85rem                      | Dracula theme                                      |
| Install cmd  | Fira Code | 400     | 0.85rem                      | color: `accent`, inside bordered box               |
| Policy badge | Fira Code | 500     | 0.7rem                       | uppercase, tracking 0.15em, amber border/bg        |

---

## Background Patterns

### Hero gradient overlay

```css
background: radial-gradient(ellipse at 50% 0%, #f59e0b08 0%, transparent 60%);
```

### Section alternation

```
Hero:      #020408  (bg)
Features:  #08101C  (surface)
Ecosystem: #020408  (bg)
```

### Optional grid (for tactical variants)

```css
/* 40px grid — amber at low opacity */
background-size: 40px 40px;
background-image:
  linear-gradient(to right, rgba(245, 158, 11, 0.03) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(245, 158, 11, 0.03) 1px, transparent 1px);
```

---

## Core Components

### Feature Card

```css
background: #0a1420;
border: 1px solid #1a2a3e;
border-radius: 2px; /* sharp edges */
padding: 28px;
transition: border-color 0.3s ease;

/* Hover */
border-color: #f59e0b60;
```

### CTA Button — Primary

```css
background: #f59e0b;
color: #020408; /* black text on amber */
font-family: Rajdhani, sans-serif;
font-weight: 600;
padding: 12px 28px;
border-radius: 2px;
transition: opacity 0.2s;
/* Hover: opacity 0.9 */
```

### CTA Button — Outline

```css
background: transparent;
color: #f59e0b;
border: 1px solid #f59e0b;
padding: 12px 28px;
border-radius: 2px;
transition:
  background 0.2s,
  color 0.2s;
/* Hover: bg #F59E0B, color #020408 */
```

### Install Command Box

```css
font-family: "Fira Code", monospace;
font-size: 0.85rem;
color: #f59e0b;
border: 1px solid #f59e0b;
padding: 12px 16px;
background: transparent;
border-radius: 2px;
```

### Mono Label

```css
font-family: "Fira Code", monospace;
font-size: 0.68rem;
text-transform: uppercase;
letter-spacing: 0.25em;
color: #f59e0b;
```

### Policy Badge

```css
display: inline-flex;
align-items: center;
gap: 6px;
font-family: "Fira Code", monospace;
font-size: 0.7rem;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.15em;
color: #f59e0b;
border: 1px solid rgba(245, 158, 11, 0.3);
padding: 4px 10px;
background: rgba(245, 158, 11, 0.05);
border-radius: 2px;
```

### Decision Badge — Allow

```css
color: #22c55e;
border-color: rgba(34, 197, 94, 0.3);
background: rgba(34, 197, 94, 0.05);
```

### Decision Badge — Deny

```css
color: #ef4444;
border-color: rgba(239, 68, 68, 0.3);
background: rgba(239, 68, 68, 0.05);
```

---

## Animations

| Name         | Duration       | Description                                      |
| ------------ | -------------- | ------------------------------------------------ |
| `fade-in-up` | 0.6s ease-out  | `translateY(20px) -> 0`, `opacity 0 -> 1`        |
| `stagger`    | +0.1s per item | Applied via IntersectionObserver, threshold 0.15 |

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

No heavy effects (no float, no scanline, no glitch) on the baseline. The Guard identity is **authoritative and precise**, matching the library's security-first philosophy.

---

## Syntax Highlighting (Dracula)

```css
.token.keyword {
  color: #ff79c6;
} /* pink */
.token.function {
  color: #50fa7b;
} /* green */
.token.string {
  color: #f1fa8c;
} /* yellow */
.token.type {
  color: #8be9fd;
} /* cyan */
.token.comment {
  color: #6272a4;
  font-style: italic;
}
.token.operator {
  color: #ff79c6;
}
.token.punctuation {
  color: #f8f8f2;
}
```

---

## Scrollbar

```css
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: #020408;
}
::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.2);
}
```

---

## Logo

Source file: [`logo-shield.svg`](./logo-shield.svg) — 200x220 amber shield with keyhole and corner ticks.

Usage:

- **Navbar:** Scale to ~32px height, place left of "Guard" wordmark
- **Hero:** Use at full size (200x220) or scale up, optionally add a CSS glow (`box-shadow: 0 0 40px rgba(245, 158, 11, 0.15)`)
- **Favicon:** Rasterize at 32x32 / 16x16 for `.ico`, or use the SVG directly for modern browsers

---

## Navbar

- Sticky top, dark background with `backdrop-blur`
- Logo: Shield SVG + "Guard" in Rajdhani Bold
- Links: `Docs | Libraries dropdown | Blog | GitHub`
- Libraries dropdown: links to all HexDI sites
- No status badge (cleaner than core) — tactical variant adds its own

---

## Footer

3 columns:

| Docs            | Ecosystem                 | Community |
| --------------- | ------------------------- | --------- |
| Getting Started | Core (hexdi.dev)          | GitHub    |
|                 | Flow (flow.hexdi.dev)     | Blog      |
|                 | Result (result.hexdi.dev) |           |
|                 | Saga (saga.hexdi.dev)     |           |

Copyright: `@hex-di/guard` at bottom.

---

## Responsive Breakpoints

| Breakpoint     | Behavior                                                   |
| -------------- | ---------------------------------------------------------- |
| `< 768px`      | Single column, collapsed navbar (hamburger), stacked cards |
| `768px–1024px` | 2-column feature grid, hero still stacked                  |
| `> 1024px`     | 3-column feature grid, full navbar, max-width containers   |

Content max-width: 800px (hero text), 1000px (feature grid).

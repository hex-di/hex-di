# Result — Shared Design System

Design tokens and conventions for all `@hex-di/result` website inspirations. Inherits the HexDI dark aesthetic but replaces the cyan/orange palette with a lime-on-black identity.

---

## Color Tokens

| Token            | Value                | Usage                                         |
| ---------------- | -------------------- | --------------------------------------------- |
| `bg`             | `#020408`            | Page background (darkest)                     |
| `surface`        | `#08101C`            | Section backgrounds, panels                   |
| `card`           | `#0a1420`            | Card/code block surfaces                      |
| `accent`         | `#A6E22E`            | Lime — CTAs, borders, highlights, mono labels |
| `accent-40`      | `#A6E22E40`          | Hover states (25% opacity)                    |
| `accent-60`      | `#A6E22E60`          | Strong hover / active states                  |
| `accent-08`      | `#A6E22E08`          | Gradient overlays, subtle tints               |
| `accent-glow`    | `0 0 20px #A6E22E20` | Box-shadow glow on hover                      |
| `text`           | `#FFFFFF`            | Headings, primary text                        |
| `text-secondary` | `#a0b4c8`            | Subtitles, taglines                           |
| `text-muted`     | `#8a9bb0`            | Body copy, descriptions                       |
| `border`         | `#1a2a3e`            | Card borders, dividers                        |

### Semantic mapping to core HexDI palette

| Core HexDI token    | Result override                                         |
| ------------------- | ------------------------------------------------------- |
| `primary` (#00F0FF) | `accent` (#A6E22E) — lime replaces cyan                 |
| `accent` (#FF5E00)  | Not used — single-accent palette                        |
| `bg` (#020408)      | Same                                                    |
| `surface` (#08101C) | Same                                                    |
| `text` (#DAE6F0)    | Lightened to `#FFFFFF` for headings, `#a0b4c8` for body |
| `muted` (#586E85)   | Shifted to `#8a9bb0` (warmer gray-blue)                 |

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

---

## Background Patterns

### Hero gradient overlay

```css
background: radial-gradient(ellipse at 50% 0%, #a6e22e08 0%, transparent 60%);
```

### Section alternation

```
Hero:      #020408  (bg)
Features:  #08101C  (surface)
Ecosystem: #020408  (bg)
```

### Optional grid (for tactical variants)

```css
/* 40px grid — lime at low opacity */
background-size: 40px 40px;
background-image:
  linear-gradient(to right, rgba(166, 226, 46, 0.03) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(166, 226, 46, 0.03) 1px, transparent 1px);
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
border-color: #a6e22e60;
```

### CTA Button — Primary

```css
background: #a6e22e;
color: #020408; /* black text on lime */
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
color: #a6e22e;
border: 1px solid #a6e22e;
padding: 12px 28px;
border-radius: 2px;
transition:
  background 0.2s,
  color 0.2s;
/* Hover: bg #A6E22E, color #020408 */
```

### Install Command Box

```css
font-family: "Fira Code", monospace;
font-size: 0.85rem;
color: #a6e22e;
border: 1px solid #a6e22e;
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
color: #a6e22e;
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

No heavy effects (no float, no scanline, no glitch). The Result identity is **clean and functional**, matching the library's philosophy.

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
  background: rgba(166, 226, 46, 0.2);
}
```

---

## Navbar

- Sticky top, dark background with `backdrop-blur`
- Logo: "Result" in Rajdhani Bold or hex logo + "Result"
- Links: `Docs | Libraries dropdown | Blog | GitHub`
- Libraries dropdown: links to all 12 HexDI sites
- No status badge (cleaner than core)

---

## Footer

3 columns:

| Docs            | Ecosystem               | Community |
| --------------- | ----------------------- | --------- |
| Getting Started | Core (hexdi.dev)        | GitHub    |
|                 | Flow (flow.hexdi.dev)   | Blog      |
|                 | Guard (guard.hexdi.dev) |           |
|                 | Saga (saga.hexdi.dev)   |           |

Copyright: `@hex-di/result` at bottom.

---

## Responsive Breakpoints

| Breakpoint     | Behavior                                                   |
| -------------- | ---------------------------------------------------------- |
| `< 768px`      | Single column, collapsed navbar (hamburger), stacked cards |
| `768px–1024px` | 2-column feature grid, hero still stacked                  |
| `> 1024px`     | 3-column feature grid, full navbar, max-width containers   |

Content max-width: 800px (hero text), 1000px (feature grid).

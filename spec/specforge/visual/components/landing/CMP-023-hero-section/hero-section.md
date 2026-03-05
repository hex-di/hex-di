# Hero Section

**ID:** CMP-023-hero-section
**Children:** ELM-072 through ELM-075
**Context:** Full-viewport hero at the top of the SpecForge landing page.

---

## ASCII Mockup

```
 Full Viewport Hero (100vh min-height)
 +======================================================================+
 |                                                                      |
 |            ~~~ animated hexagon grid background ~~~                  |
 |                                                                      |
 |        . . . . . . . . . . . . . . . . . . . . . . . .              |
 |       .  ___    ___    ___    ___    ___    ___    ___  .             |
 |      . /     \/     \/     \/     \/     \/     \/     \ .           |
 |     .  \___  /\___  /\___  /\___  /\___  /\___  /\___  / .           |
 |      .  ___\/  ___\/  ___\/  ___\/  ___\/  ___\/  ___\/  .           |
 |       . . . . . . . . . . . . . . . . . . . . . . . .               |
 |                                                                      |
 |                      (padding-top ~20vh)                             |
 |                                                                      |
 |              +----------------------------------+                    |
 |              |        ELM-072 Headline          |                    |
 |              |                                  |                    |
 |              |   AI-Powered Specification       |                    |
 |              |         Authoring                |                    |
 |              |                                  |                    |
 |              |  Rajdhani 48px, 700 weight       |                    |
 |              |  gradient: accent -> accent-light|                    |
 |              +----------------------------------+                    |
 |                         (16px gap)                                   |
 |              +----------------------------------+                    |
 |              |      ELM-073 Subheadline         |                    |
 |              |                                  |                    |
 |              |  Multi-agent collaboration for   |                    |
 |              |  production-grade software specs |                    |
 |              |                                  |                    |
 |              |  Inter 20px, muted color         |                    |
 |              |  max-width: 600px                |                    |
 |              +----------------------------------+                    |
 |                         (40px gap)                                   |
 |              +----------------+  +---------------------+             |
 |              | ELM-074        |  | ELM-075             |             |
 |              |                |  |                     |             |
 |              | [Get Started]  |  | [View Documentation]|             |
 |              |                |  |                     |             |
 |              | accent bg      |  | ghost / accent      |             |
 |              | dark text      |  | border              |             |
 |              | pill shape     |  | pill shape           |             |
 |              +----------------+  +---------------------+             |
 |                                                                      |
 +======================================================================+
```

### CTA Button Detail

```
 Primary CTA (ELM-074)            Secondary CTA (ELM-075)
 +-------------------+            +------------------------+
 |                   |            |                        |
 |   Get Started     |            |  View Documentation    |
 |                   |            |                        |
 +-------------------+            +------------------------+
  bg: #00F0FF                      bg: transparent
  text: #020408                    text: #00F0FF
  border: none                     border: 1px solid #00F0FF
  radius: 999px                    radius: 999px
  pad: 12px 32px                   pad: 12px 32px

 Hover states:
 +-------------------+            +------------------------+
 |                   |            |                        |
 |   Get Started     |            |  View Documentation    |
 |   (glow effect)   |            |  (subtle bg fill)      |
 +-------------------+            +------------------------+
  bg: #5FFFFF                      bg: rgba(0,240,255,0.08)
  shadow: 0 0 20px                 text: #5FFFFF
    rgba(0,240,255,0.3)            border: 1px solid #5FFFFF
```

## Visual States

### ELM-072 Hero Headline

- Rajdhani font, 48px, weight 700, line-height 1.1.
- Text rendered with gradient fill: `linear-gradient(135deg, --sf-accent, --sf-accent-light)`.
- Uses `-webkit-background-clip: text` for gradient text effect.
- 16px bottom margin before subheadline.

### ELM-073 Hero Subheadline

- Inter font, 20px, weight 400, line-height 1.5.
- Color: `--sf-text-muted` (#586E85).
- Max-width 600px to prevent overly long lines.
- 40px bottom margin before CTA buttons.

### ELM-074 Hero CTA Primary

| State   | Background          | Text Color | Extra                                      |
| ------- | ------------------- | ---------- | ------------------------------------------ |
| Default | `--sf-accent`       | `--sf-bg`  | --                                         |
| Hover   | `--sf-accent-light` | `--sf-bg`  | Glow shadow `0 0 20px rgba(0,240,255,0.3)` |
| Focus   | `--sf-accent`       | `--sf-bg`  | 2px outline, 2px offset                    |

- Pill shape: `border-radius: 999px`.
- Padding: 12px vertical, 32px horizontal.
- 16px right margin separating it from secondary CTA.

### ELM-075 Hero CTA Secondary

| State   | Background                | Text Color          | Border                        |
| ------- | ------------------------- | ------------------- | ----------------------------- |
| Default | `transparent`             | `--sf-accent`       | `1px solid --sf-accent`       |
| Hover   | `rgba(0, 240, 255, 0.08)` | `--sf-accent-light` | `1px solid --sf-accent-light` |
| Focus   | `transparent`             | `--sf-accent`       | 2px outline, 2px offset       |

- Ghost button style: transparent background with accent border.
- Same pill shape and padding as primary CTA.

## Background Animation

- Hexagonal grid pattern composed of semi-transparent hexagonal outlines.
- Hexagons use `--sf-accent` at 6% opacity.
- Slow upward drift animation (subtle parallax feel).
- Gentle pulse effect: hexagon opacity cycles between 4% and 8% over 4 seconds.
- Implemented via `<canvas>` or inline SVG with CSS animation.
- Does not interfere with text readability (z-index layering).
- Respects `prefers-reduced-motion`: animation pauses when reduced motion is enabled.

## Token Usage

| Token               | Usage                               |
| ------------------- | ----------------------------------- |
| `--sf-bg`           | Section background, CTA text color  |
| `--sf-accent`       | Headline gradient start, CTA bg     |
| `--sf-accent-light` | Headline gradient end, hover states |
| `--sf-text-muted`   | Subheadline text color              |
| `--sf-font-display` | Headline font (Rajdhani)            |
| `--sf-font-body`    | Subheadline and button font (Inter) |

## Cross-References

- **Page:** PGE-003-landing-page (parent page)
- **Component:** CMP-024-feature-grid (next section below hero)

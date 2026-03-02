# 04 — Landing Page (Tactical / HUD)

**Title:** Result — Type-Safe Error Handling for TypeScript
**Type:** Marketing landing page with tactical HUD aesthetic
**Layout:** Vertical scroll, 5 sections
**Accent:** `#A6E22E` (lime)
**Mood:** Cyberpunk tactical — carries forward the core HexDI HUD language (corner brackets, scanlines, grid bg) but with lime instead of cyan

---

## Overview

The "tactical" variant brings the core HexDI visual language (HUD cards, corner brackets, grid background, scanline overlays) into the Result site, recolored from cyan to lime. More visually intense than variants 01–03. Uses the `hud-card` pattern with expanding corner brackets on hover, a subtle 40px grid background, and a floating 3D tilt on the hero visual.

---

## Color Palette

Uses the Result palette (see `design-system.md`) plus tactical overlays:

| Token         | Value                               | Usage                          |
| ------------- | ----------------------------------- | ------------------------------ |
| `grid-line`   | `rgba(166, 226, 46, 0.03)`          | 40px background grid lines     |
| `scanline`    | `rgba(166, 226, 46, 0.02)`          | Horizontal scanline overlay    |
| `bracket`     | `#A6E22E`                           | Corner bracket pseudo-elements |
| `glow-shadow` | `0 0 20px rgba(166, 226, 46, 0.15)` | Card hover glow                |

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  fixed h-16  bg blur  tactical bottom border                  |
|  logo + [Docs] [Libraries] [Blog] + status badge + GitHub         |
+------------------------------------------------------------------+
|  (40px lime grid background, full page, 0.03 opacity)             |
|  (radial gradient mask: transparent center, dark edges)            |
|                                                                    |
|  HERO  min-h-screen  pt-20                                         |
|  +----------------------------+  +----------------------------+    |
|  |  Left col                  |  |  Right col                 |    |
|  |                            |  |                            |    |
|  |  [RESULT::ACTIVE] badge    |  |  +---------+               |    |
|  |                            |  |  | Result  |               |    |
|  |  THE COMPILER              |  |  | <T, E>  |  <- hud-card  |    |
|  |  HANDLES THE               |  |  |         |     floating  |    |
|  |  ERRORS                    |  |  | Ok | Err|     3D tilt   |    |
|  |                            |  |  |         |               |    |
|  |  You handle the logic.     |  |  | .map()  |               |    |
|  |                            |  |  | .match()|               |    |
|  |  [ Initialize ] [ Docs ]   |  |  +---------+               |    |
|  |                            |  |                            |    |
|  |  $ npm install @hex-di/... |  |  scanline overlay          |    |
|  +----------------------------+  +----------------------------+    |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  FEATURES  py-32  6x hud-card with corner brackets                 |
|                                                                    |
|  +----------+  +----------+  +----------+                          |
|  | [  ]     |  | [  ]     |  | [  ]     |   <- corner brackets    |
|  |          |  |          |  |          |      expand on hover     |
|  | No More  |  | Railway  |  | Exhaust  |                          |
|  | Try-Catch|  | Oriented |  | Matching |                          |
|  |          |  |          |  |          |                          |
|  |     [  ] |  |     [  ] |  |     [  ] |                          |
|  +----------+  +----------+  +----------+                          |
|                                                                    |
|  +----------+  +----------+  +----------+                          |
|  | Zero Cost|  | Composable| | Agnostic |                          |
|  +----------+  +----------+  +----------+                          |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CODE PREVIEW  bg alternating                                      |
|  terminal window with scanline overlay + syntax-highlighted code   |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  COMPARISON  2-col                                                 |
|  [RUNTIME_ERR] vs [COMPILE_OK] badges                              |
|  red hud-card vs lime hud-card                                     |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CTA  full-width hud-card  large heading + 2 buttons               |
|                                                                    |
+------------------------------------------------------------------+
|  FOOTER  tactical border top  3-col                                |
+------------------------------------------------------------------+
```

---

## Navigation

- **Height:** `h-16` fixed
- **Background:** `rgba(2, 4, 8, 0.9)`, `backdrop-filter: blur(12px)`
- **Bottom border:** tactical — `1px solid rgba(166, 226, 46, 0.2)` + `box-shadow: 0 4px 20px -10px rgba(166, 226, 46, 0.3)`
- **Logo:** "Result" in Rajdhani 700, white
- **Links:** `[Docs]` `[Libraries]` `[Blog]` — bracket-wrapped, Fira Code 0.8rem, hover: lime
- **Right side:** status badge + GitHub icon

### Status Badge

```html
<div class="badge">
  <div class="pulse-dot"></div>
  RESULT::v0.2
</div>
```

- Fira Code 0.65rem, uppercase, tracking 0.2em
- 1px lime border at 30% opacity, lime bg at 5%
- Pulsing 6px lime dot

---

## Hero Section

**Min-height:** 100vh, `display: flex; align-items: center; padding-top: 80px`
**Background:** `#020408` + 40px grid + radial gradient mask
**Layout:** 2-column grid (`grid-cols-2 gap-16`)

### Left Column

1. **Badge:** `[RESULT::ACTIVE]` — Fira Code 0.65rem, lime border, lime text, pulsing dot
2. **H1:** Three lines, Rajdhani 700, uppercase, `text-5xl md:text-7xl leading-[0.9]`:
   - "THE COMPILER"
   - "HANDLES THE"
   - "ERRORS" — this word in lime
3. **Subtitle:** "You handle the logic." — Inter 1rem, `#a0b4c8`, `border-left: 2px solid rgba(166, 226, 46, 0.2); padding-left: 16px`
4. **CTA buttons** (horizontal):
   - Primary: `bg: rgba(166, 226, 46, 0.1)`, `border: 1px solid #A6E22E`, lime text, clip-path slant
   - Secondary: ghost border, hover fill
5. **Install widget:** Same as 01 but with corner brackets decoration

### Right Column — Floating HUD Card

A `hud-card` with **3D tilt float animation** showing a stylized Result type:

```
+--[ Result<T, E> ]--+
|                     |
|   Ok(value: T)      |  <- lime text
|   Err(error: E)     |  <- red text (#F92672)
|                     |
|   .map(f)           |
|   .andThen(f)       |
|   .match(ok, err)   |
|                     |
+--------------------+
```

**Card spec:**

- `bg: rgba(8, 16, 28, 0.6)`, `backdrop-filter: blur(8px)`
- `border: 1px solid rgba(166, 226, 46, 0.15)`
- Corner brackets: 15px, 2px, `#A6E22E`
- Float animation: `6s ease-in-out infinite`, `translateY(0) -> translateY(-10px)`, `rotateX(5deg) rotateZ(-2deg)`
- Scanline overlay: `4px repeating linear-gradient, rgba(166, 226, 46, 0.02)`

---

## Feature Cards (HUD Style)

Same 6 features as 01, but styled as `hud-card`:

**Card spec:**

```css
background: rgba(8, 16, 28, 0.5);
backdrop-filter: blur(4px);
border: 1px solid rgba(166, 226, 46, 0.12);
padding: 28px;
position: relative;

/* Corner brackets */
::before {
  /* top-left */
  width: 12px;
  height: 12px;
  border-top: 2px solid #a6e22e;
  border-left: 2px solid #a6e22e;
}
::after {
  /* bottom-right */
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #a6e22e;
  border-right: 2px solid #a6e22e;
}

/* Hover */
background: rgba(166, 226, 46, 0.04);
border-color: rgba(166, 226, 46, 0.4);
box-shadow: 0 0 20px rgba(166, 226, 46, 0.1);
::before,
::after {
  width: 100%;
  height: 100%;
  opacity: 0.3;
} /* full-frame brackets */
```

**Icon per card:** 48px square container with colored border/fill (like core 01):

- No More Try-Catch → lime
- Railway-Oriented → teal (`#20B2AA`)
- Exhaustive Matching → purple (`#BD93F9`)
- Zero Runtime Cost → orange (`#FFB86C`)
- Composable → indigo (`#6272A4`)
- Framework Agnostic → pink (`#FF79C6`)

---

## Code Preview Section

**Background:** `#05080F` (slightly lighter dark)
**Layout:** `grid-cols-5`, left 2/5 text + right 3/5 code window

### Code Window (Terminal Style)

- Header: `#0a1420`, macOS dots, label `TERMINAL_01`, filename `pipeline.ts`
- Scanline overlay: absolute, `repeating-linear-gradient`, `4px` lines, `0.02` opacity
- Progress bar at bottom: `h-1`, lime, pulsing glow

### Code Content

```typescript
import { ok, err } from "@hex-di/result";

const getUser = (id: string) =>
  tryCatch(
    () => db.findUser(id),
    () => ({ _tag: "NotFound" as const, id })
  );

const result = getUser("u-123")
  .andThen(validatePermissions)
  .map(buildProfile)
  .match(
    profile => Response.ok(profile),
    error => Response.error(error)
  );
```

---

## Comparison Section

**Background:** `#020408`
**Layout:** 2-column, centered heading above

### Before Card (Red HUD)

- Border: `1px solid rgba(249, 38, 114, 0.3)`
- Badge: `RUNTIME_ERR` — Fira Code, red bg at 10%, red text
- Corner brackets in `#F92672`
- Code: traditional try-catch pattern

### After Card (Lime HUD)

- Border: `1px solid rgba(166, 226, 46, 0.3)`
- Badge: `COMPILE_OK` — Fira Code, lime bg at 10%, lime text
- Corner brackets in `#A6E22E`
- Code: Result chain pattern

---

## CTA Section

Full-width `hud-card` with:

- H2: "Ready to eliminate runtime errors?" — Rajdhani 700
- 2 buttons: Primary (solid lime slant) + Secondary (ghost)
- Corner brackets at all 4 corners (32px size)

---

## Animations

| Element               | Animation                                        |
| --------------------- | ------------------------------------------------ |
| Hero HUD card         | `float: 6s ease-in-out infinite` with 3D tilt    |
| Feature card brackets | Expand to 100% on hover, 0.4s cubic-bezier       |
| Feature cards         | `fade-in-up` on scroll, staggered                |
| Code window           | `fade-in-up` on scroll                           |
| Status badge dot      | `pulse: 2s ease-in-out infinite`                 |
| Grid background       | Static (no scroll animation — keeps it readable) |

---

## Key Differences from Core HexDI Tactical (04)

| Aspect           | Core HexDI 04            | Result 04                             |
| ---------------- | ------------------------ | ------------------------------------- |
| Primary color    | `#00F0FF` (cyan)         | `#A6E22E` (lime)                      |
| Secondary color  | `#FF5E00` (orange)       | `#F92672` (pink/red) for Err          |
| Hero visual      | Hex dependency graph SVG | Floating HUD card with type signature |
| Rising particles | Yes                      | No (cleaner)                          |
| 3D depth cards   | Yes (perspective hover)  | Corner bracket expansion only         |
| Grid intensity   | 40px, 0.05 opacity       | 40px, 0.03 opacity (subtler)          |

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Result — Type-Safe Error Handling for TypeScript</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400&family=Fira+Code:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #020408;
        --surface: #08101c;
        --card: #0a1420;
        --accent: #a6e22e;
        --accent-40: #a6e22e40;
        --accent-60: #a6e22e60;
        --accent-08: #a6e22e08;
        --err: #f92672;
        --text: #ffffff;
        --text-secondary: #a0b4c8;
        --text-muted: #8a9bb0;
        --border: #1a2a3e;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: var(--bg);
        color: var(--text-muted);
        font-family: "Inter", sans-serif;
        overflow-x: hidden;
      }

      /* Grid background */
      .bg-grid {
        background-size: 40px 40px;
        background-image:
          linear-gradient(to right, rgba(166, 226, 46, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(166, 226, 46, 0.03) 1px, transparent 1px);
      }

      /* HUD Card */
      .hud-card {
        background: rgba(8, 16, 28, 0.5);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(166, 226, 46, 0.12);
        padding: 28px;
        position: relative;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hud-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 12px;
        height: 12px;
        border-top: 2px solid var(--accent);
        border-left: 2px solid var(--accent);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hud-card::after {
        content: "";
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-bottom: 2px solid var(--accent);
        border-right: 2px solid var(--accent);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hud-card:hover {
        background: rgba(166, 226, 46, 0.04);
        border-color: rgba(166, 226, 46, 0.4);
        box-shadow: 0 0 20px rgba(166, 226, 46, 0.1);
      }
      .hud-card:hover::before,
      .hud-card:hover::after {
        width: 100%;
        height: 100%;
        opacity: 0.3;
      }

      /* Float animation */
      @keyframes float {
        0%,
        100% {
          transform: translateY(0) rotateX(5deg) rotateZ(-2deg);
        }
        50% {
          transform: translateY(-10px) rotateX(5deg) rotateZ(-2deg);
        }
      }

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

      @keyframes pulse {
        0%,
        100% {
          opacity: 0.4;
        }
        50% {
          opacity: 1;
        }
      }

      /* Tactical bottom border */
      .tactical-border-b {
        border-bottom: 1px solid rgba(166, 226, 46, 0.2);
        box-shadow: 0 4px 20px -10px rgba(166, 226, 46, 0.3);
      }

      /* Clip-path slant button */
      .btn-slant {
        clip-path: polygon(0 0, 100% 0, 93% 100%, 0% 100%);
      }
    </style>
  </head>
  <body class="bg-grid">
    <!-- Full-page grid overlay with radial mask -->
    <div
      style="position:fixed;inset:0;background:radial-gradient(circle at 50% 50%, transparent 0%, rgba(2,4,8,0.8) 100%);pointer-events:none;z-index:0;"
    ></div>

    <!-- NAV -->
    <nav
      class="tactical-border-b"
      style="position:fixed;top:0;width:100%;z-index:100;background:rgba(2,4,8,0.9);backdrop-filter:blur(12px);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;"
    >
      <div
        style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.25rem;color:var(--text);"
      >
        Result
      </div>
      <div style="display:flex;align-items:center;gap:1.5rem;">
        <a
          href="/docs"
          style="font-family:'Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;"
          >[Docs]</a
        >
        <a
          href="#"
          style="font-family:'Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;"
          >[Libraries]</a
        >
        <a
          href="/blog"
          style="font-family:'Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;"
          >[Blog]</a
        >
        <!-- Status badge -->
        <div
          style="display:flex;align-items:center;gap:6px;font-family:'Fira Code',monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--accent);border:1px solid rgba(166,226,46,0.3);padding:4px 10px;background:rgba(166,226,46,0.05);"
        >
          <div
            style="width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse 2s ease-in-out infinite;"
          ></div>
          RESULT::v0.2
        </div>
      </div>
    </nav>

    <main style="position:relative;z-index:10;">
      <!-- HERO -->
      <section style="min-height:100vh;display:flex;align-items:center;padding-top:80px;">
        <div
          style="max-width:1200px;margin:0 auto;padding:0 2.5rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;"
        >
          <!-- Left: text -->
          <div>
            <!-- Badge, H1 (uppercase), subtitle, CTA buttons, install widget -->
          </div>
          <!-- Right: floating HUD card -->
          <div style="display:flex;justify-content:center;">
            <div
              class="hud-card"
              style="width:320px;animation:float 6s ease-in-out infinite;perspective:1000px;"
            >
              <pre
                style="font-family:'Fira Code',monospace;font-size:0.85rem;line-height:2;margin:0;"
              >
<span style="color:var(--text-muted);">Result&lt;T, E&gt;</span>

<span style="color:var(--accent);">  Ok(value: T)</span>
<span style="color:var(--err);">  Err(error: E)</span>

<span style="color:var(--text-muted);">  .map(f)</span>
<span style="color:var(--text-muted);">  .andThen(f)</span>
<span style="color:var(--text-muted);">  .match(ok, err)</span></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURES (6x hud-card) -->
      <!-- CODE PREVIEW (terminal window) -->
      <!-- COMPARISON (red hud vs lime hud) -->
      <!-- CTA (full-width hud-card) -->
      <!-- FOOTER -->
    </main>
  </body>
</html>
```

</details>
